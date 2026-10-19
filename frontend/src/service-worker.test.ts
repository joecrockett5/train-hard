import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { build, files, version } from '$service-worker';

/**
 * Tests the worker against fake `caches` and `fetch`.
 *
 * Worth testing at all because of how a service worker fails: it lives on the
 * device, not on the server, so a worker that misbehaves keeps misbehaving
 * after the fix is deployed. Two of these cover exactly that, and both are
 * regression tests for a phone that could only be recovered by clearing the
 * site's data by hand.
 */

const ORIGIN = 'https://training.jmedia';
/** Mirrors the worker's own list, so a change there has to be made twice. */
const OS_FETCHED = ['/manifest.webmanifest', '/apple-touch-icon.png', '/favicon.png'];
const PRECACHE = [...build, ...files].filter((path) => !OS_FETCHED.includes(path));
const CACHE = `hard-cache-${version}`;

type Listener = (event: unknown) => void;

const listeners = new Map<string, Listener>();

/** Responses the fake `fetch` will serve, keyed by absolute URL. */
const routes = new Map<string, () => Promise<Response>>();

function absolute(url: string): string {
	return new URL(url, ORIGIN).href;
}

/** Serves `routes`, and rejects for anything else, as an offline fetch does. */
function fakeFetch(input: Request | string): Promise<Response> {
	const url = typeof input === 'string' ? absolute(input) : input.url;
	const route = routes.get(url);

	if (!route) {
		return Promise.reject(new TypeError('Load failed'));
	}

	return route();
}

/** Enough of the Cache interface for what the worker uses. */
class FakeCache {
	readonly entries = new Map<string, Response>();

	/** Rejects on a non-2xx response, which is what makes a real `add` fail. */
	async add(path: string): Promise<void> {
		const response = await fakeFetch(path);

		if (!response.ok) {
			throw new TypeError(`Request for ${path} failed`);
		}

		this.entries.set(absolute(path), response);
	}

	put(request: Request | string, response: Response): Promise<void> {
		const key = typeof request === 'string' ? absolute(request) : request.url;
		this.entries.set(key, response);
		return Promise.resolve();
	}

	match(request: Request | string): Promise<Response | undefined> {
		const key = typeof request === 'string' ? absolute(request) : request.url;
		return Promise.resolve(this.entries.get(key));
	}
}

const stores = new Map<string, FakeCache>();

const fakeCaches = {
	open: async (name: string) => {
		const existing = stores.get(name);

		if (existing) {
			return existing;
		}

		const created = new FakeCache();
		stores.set(name, created);
		return created;
	},
	keys: async () => [...stores.keys()],
	delete: async (name: string) => stores.delete(name)
};

const skipWaiting = vi.fn();
const claim = vi.fn();

beforeAll(async () => {
	vi.stubGlobal('self', {
		addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
		skipWaiting,
		clients: { claim }
	});
	vi.stubGlobal('location', { origin: ORIGIN });
	vi.stubGlobal('caches', fakeCaches);
	vi.stubGlobal('fetch', fakeFetch);

	// Imported last: it reads `self` and registers its listeners on import.
	await import('./service-worker');
});

beforeEach(() => {
	stores.clear();
	routes.clear();
	skipWaiting.mockClear();
	claim.mockClear();

	for (const path of PRECACHE) {
		routes.set(absolute(path), () => Promise.resolve(new Response('asset', { status: 200 })));
	}
});

/** Runs the install handler and waits for the work it extended the event by. */
async function install(): Promise<void> {
	const pending: Promise<unknown>[] = [];

	listeners.get('install')?.({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });

	await Promise.all(pending);
}

async function activate(): Promise<void> {
	const pending: Promise<unknown>[] = [];

	listeners.get('activate')?.({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });

	await Promise.all(pending);
}

/** Returns what the worker responded with, or undefined if it passed through. */
function handleFetch(request: Request): Promise<Response> | undefined {
	let responded: Promise<Response> | undefined;

	listeners.get('fetch')?.({
		request,
		respondWith: (promise: Promise<Response>) => {
			responded = promise;
		}
	});

	return responded;
}

function cached(): FakeCache {
	const store = stores.get(CACHE);

	if (!store) {
		throw new Error(`Nothing opened ${CACHE}`);
	}

	return store;
}

describe('install', () => {
	it('precaches the build and static files, then takes over', async () => {
		await install();

		expect([...cached().entries.keys()].sort()).toEqual(PRECACHE.map(absolute).sort());
		expect(skipWaiting).toHaveBeenCalled();
	});

	it('still installs when an asset fails, rather than stranding the old worker', async () => {
		// `cache.addAll` rejected the whole batch over one missing file, so the
		// install failed, so the worker already on the phone was never
		// replaced -- and a deploy could not fix it.
		const missing = absolute(PRECACHE[0]);
		routes.set(missing, () => Promise.resolve(new Response('nope', { status: 404 })));

		await expect(install()).resolves.toBeUndefined();

		expect(skipWaiting).toHaveBeenCalled();
		expect([...cached().entries.keys()]).not.toContain(missing);
		expect(cached().entries.size).toBe(PRECACHE.length - 1);
	});
});

describe('activate', () => {
	it('deletes the previous build’s cache and claims open pages', async () => {
		await install();
		stores.set('hard-cache-older', new FakeCache());

		await activate();

		expect([...stores.keys()]).toEqual([CACHE]);
		expect(claim).toHaveBeenCalled();
	});
});

describe('fetching an asset', () => {
	it('serves it from the cache without touching the network', async () => {
		await install();
		routes.clear();

		const response = await handleFetch(new Request(absolute(PRECACHE[0])));

		expect(response?.status).toBe(200);
	});

	it('goes to the network for one that failed to precache', async () => {
		const missing = absolute(PRECACHE[0]);
		routes.set(missing, () => Promise.resolve(new Response('nope', { status: 404 })));
		await install();

		routes.set(missing, () => Promise.resolve(new Response('recovered', { status: 200 })));
		const response = await handleFetch(new Request(missing));

		expect(await response?.text()).toBe('recovered');
	});
});

describe('fetching a page', () => {
	const page = `${ORIGIN}/workouts`;

	it('prefers the network and keeps a copy', async () => {
		routes.set(page, () => Promise.resolve(new Response('live', { status: 200 })));

		const response = await handleFetch(new Request(page));

		expect(await response?.text()).toBe('live');
		expect(cached().entries.has(page)).toBe(true);
	});

	it('does not cache an error response', async () => {
		routes.set(page, () => Promise.resolve(new Response('boom', { status: 500 })));

		const response = await handleFetch(new Request(page));

		expect(response?.status).toBe(500);
		expect(cached().entries.has(page)).toBe(false);
	});

	it('falls back to the stored copy when the network is gone', async () => {
		routes.set(page, () => Promise.resolve(new Response('live', { status: 200 })));
		await handleFetch(new Request(page));

		routes.clear();
		const response = await handleFetch(new Request(page));

		expect(await response?.text()).toBe('live');
	});

	it('answers with a 503 rather than rejecting when there is no copy', async () => {
		// Rethrowing rejected respondWith, which Safari showed as
		// "FetchEvent.respondWith received an error: TypeError: Load failed"
		// -- a message about the worker that tells the reader nothing.
		const response = await handleFetch(new Request(page));

		expect(response?.status).toBe(503);
		expect(await response?.text()).toContain('Cannot reach the app');
	});
});

describe('requests the worker keeps out of', () => {
	it('leaves API calls to the network', () => {
		expect(handleFetch(new Request(`${ORIGIN}/api/workouts`))).toBeUndefined();
	});

	it.each(OS_FETCHED)('leaves %s to the network, because the OS fetches it', (path) => {
		// A blank Home Screen icon on a phone where the same URL loaded fine
		// in a tab. Safari fetches the icon from outside any page, and
		// whatever the worker did with that request, it was not a PNG.
		expect(handleFetch(new Request(absolute(path)))).toBeUndefined();
	});

	it('does not precache them either, so none can be served from the cache', async () => {
		await install();

		for (const path of OS_FETCHED) {
			expect([...cached().entries.keys()]).not.toContain(absolute(path));
		}
	});

	it('still precaches the assets the app itself uses', async () => {
		await install();

		expect([...cached().entries.keys()]).toContain(absolute('/hard-logo.png'));
	});

	it('leaves anything that is not a GET', () => {
		expect(handleFetch(new Request(`${ORIGIN}/workouts`, { method: 'POST' }))).toBeUndefined();
	});

	it('leaves another origin alone', () => {
		expect(handleFetch(new Request('https://example.com/workouts'))).toBeUndefined();
	});
});
