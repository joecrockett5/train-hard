/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

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

// `build` is the compiled JS and CSS, `files` is everything in static/.
const PRECACHE = [...build, ...files];

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => worker.skipWaiting())
	);
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

	const isPrecached = PRECACHE.includes(url.pathname);

	if (isPrecached) {
		// Build output is content-hashed and static/ is stable, so the cache
		// is authoritative and there is no reason to revalidate.
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
			} catch (networkError) {
				const hit = await cache.match(request);

				if (hit) {
					return hit;
				}

				throw networkError;
			}
		})()
	);
});
