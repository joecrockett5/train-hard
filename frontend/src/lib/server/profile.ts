/** Cookie holding the active profile id. Read in hooks.server.ts. */
export const PROFILE_COOKIE = 'profileId';

export const PROFILE_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	maxAge: 60 * 60 * 24 * 365
} as const;

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
