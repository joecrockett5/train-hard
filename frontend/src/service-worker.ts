/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { base, build, files, version } from '$service-worker';

/**
 * Caches the app's own assets so it loads instantly and survives a bad
 * connection -- a gym basement being the motivating case.
 *
 * Deliberately limited to assets. Workout data is never cached: showing a
 * stale set list would be worse than showing an error, and logging a set
 * offline needs a sync queue that reconciles against the backend, which this
 * does not attempt.
 */

const worker = self as unknown as ServiceWorkerGlobalScope;

// `version` changes per build, so each deployment gets its own cache and the
// previous one is deleted on activate.
const CACHE = `hard-cache-${version}`;

/**
 * The icons and the manifest, which the operating system fetches itself.
 *
 * Safari asks for these to add the app to the Home Screen, and it asks from
 * outside any open page -- so the request is one the worker has no context
 * for and no way to improve on. Serving them through the worker only adds a
 * way for the OS to be handed a failure instead of a PNG, which is how a
 * Home Screen icon ends up blank while the same file loads fine in a tab.
 *
 * They are small, they rarely change, and the HTTP cache already handles
 * them, so there is nothing to gain by intercepting them either.
 *
 * Prefixed with `base` because `build` and `files` are, and these are
 * compared against both those lists and a request's own pathname.
 */
const OS_FETCHED = [
	'/manifest.webmanifest',
	'/apple-touch-icon.png',
	'/favicon.png',
	'/icon-192.png',
	'/icon-512.png'
].map((path) => `${base}${path}`);

// `build` is the compiled JS and CSS, `files` is everything in static/. The
// OS-fetched ones are left out so they are never served from the cache.
const PRECACHE = [...build, ...files].filter((path) => !OS_FETCHED.includes(path));

/**
 * Precaches file by file, tolerating any that fail.
 *
 * `cache.addAll` rejects the whole batch if a single request does, which
 * fails the install -- and a worker that cannot install never replaces the
 * one already running. The old worker then keeps serving, and keeps failing,
 * with no way back except clearing the site's data by hand. One asset being
 * briefly unavailable mid-deploy should not be able to strand a device.
 *
 * A file missed here is not lost: the fetch handler finds it absent from the
 * cache and goes to the network for it.
 */
async function precache(): Promise<void> {
	const cache = await caches.open(CACHE);

	await Promise.all(
		PRECACHE.map(async (path) => {
			try {
				await cache.add(path);
			} catch {
				// Left out of the cache; fetched from the network on demand.
			}
		})
	);
}

worker.addEventListener('install', (event) => {
	event.waitUntil(precache().then(() => worker.skipWaiting()));
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only GETs are cacheable, and only this origin's own assets.
	if (request.method !== 'GET' || url.origin !== location.origin) {
		return;
	}

	// Anything under /api is live data. Let it go to the network untouched.
	if (url.pathname.startsWith('/api/')) {
		return;
	}

	// Likewise the icons and the manifest: the OS asks for these, and nothing
	// the worker can do with the request helps.
	if (OS_FETCHED.includes(url.pathname)) {
		return;
	}

	const isPrecached = PRECACHE.includes(url.pathname);

	if (isPrecached) {
		// Build output is content-hashed and static/ is stable, so the cache
		// is authoritative and there is no reason to revalidate. A file that
		// failed to precache is simply absent, and falls through to the
		// network.
		event.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const hit = await cache.match(url.pathname);
				return hit ?? fetch(request);
			})
		);
		return;
	}

	// Pages: network first, falling back to a cached copy only if the network
	// is unavailable, so a reachable backend always wins.
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			try {
				const response = await fetch(request);

				if (response.status === 200) {
					cache.put(request, response.clone());
				}

				return response;
			} catch {
				const hit = await cache.match(request);

				if (hit) {
					return hit;
				}

				// Rethrowing rejects respondWith, and the browser reports
				// that as "FetchEvent.respondWith received an error", which
				// names the worker rather than the problem and offers the
				// reader nothing to do. Say what happened instead.
				return new Response(
					'Cannot reach the app, and no copy of this page is stored on this device.',
					{ status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
				);
			}
		})()
	);
});
