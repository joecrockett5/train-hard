import type { Cookies } from '@sveltejs/kit';

/** Cookie holding the active profile id. Read in hooks.server.ts. */
export const PROFILE_COOKIE = 'profileId';

/**
 * Options for the profile cookie, for a request arriving at `url`.
 *
 * `secure` has to be computed rather than fixed. SvelteKit's `cookies.set()`
 * defaults it to true for every hostname except localhost, and a browser
 * silently discards a Secure cookie delivered over plain HTTP. Served at
 * something like http://training.jmedia that made selecting a profile appear
 * to do nothing: the POST succeeded, the cookie came back, the browser threw
 * it away, and the next request bounced to the picker again.
 *
 * Mirroring the request's own scheme fixes that, and means the cookie becomes
 * Secure by itself the moment the app is served over HTTPS -- no setting to
 * remember to change. Behind a reverse proxy the scheme comes from ORIGIN,
 * which already has to be set for the CSRF check.
 */
export function profileCookieOptions(url: URL) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365,
		secure: url.protocol === 'https:'
	} as const;
}

/** Deleting a cookie has to match the attributes it was set with. */
export function clearProfileCookie(cookies: Cookies, url: URL): void {
	cookies.delete(PROFILE_COOKIE, {
		path: '/',
		secure: url.protocol === 'https:'
	});
}

export type Profile = {
	objectId: string;
	name: string;
};

/**
 * Profile names, cached in the server process.
 *
 * The layout resolves the active profile's name on every page render, which
 * was a backend round trip per navigation for a value that essentially never
 * changes. The TTL is short because the only thing that invalidates it is a
 * rename, which the UI does not currently offer.
 */
const TTL_MS = 60_000;

const cache = new Map<string, { profile: Profile; expires: number }>();

export function getCachedProfile(profileId: string): Profile | undefined {
	const hit = cache.get(profileId);

	if (!hit) {
		return undefined;
	}

	if (hit.expires < Date.now()) {
		cache.delete(profileId);
		return undefined;
	}

	return hit.profile;
}

export function cacheProfile(profile: Profile): Profile {
	cache.set(profile.objectId, { profile, expires: Date.now() + TTL_MS });
	return profile;
}

/** Drops a profile from the cache, for deletes and renames. */
export function forgetProfile(profileId: string): void {
	cache.delete(profileId);
}
