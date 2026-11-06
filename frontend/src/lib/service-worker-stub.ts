/**
 * Stands in for `$service-worker` under Vitest.
 *
 * SvelteKit generates that module during a build, from the real manifest, so
 * a plain Vitest run cannot resolve it. `vitest.config.ts` aliases it here.
 *
 * The lists are short stand-ins rather than the real manifest: the worker's
 * tests care about how it treats an asset, not which assets a build produced.
 */
export const build = ['/_app/immutable/entry/app.js', '/_app/immutable/assets/app.css'];
// `brand/logo-mark.svg` is used by the app itself; the rest are fetched by
// the OS, which the worker treats differently, so both kinds are represented.
export const files = [
	'/brand/logo-mark.svg',
	'/apple-touch-icon.png',
	'/favicon.png',
	'/favicon.svg',
	'/icon-192.png',
	'/icon-512.png',
	'/icon-maskable-192.png',
	'/icon-maskable-512.png',
	'/manifest.webmanifest'
];
export const version = 'test-version';
export const prerendered: string[] = [];
export const base = '';
