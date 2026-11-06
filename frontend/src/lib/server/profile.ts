import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

/** Cookie holding the active profile id. Read in hooks.server.ts. */
export const PROFILE_COOKIE = 'profileId';

/**
 * Cookie holding the active profile's theme, so the server can put the right
 * value on <html> in the first byte it sends.
 *
 * The profile is the source of truth; this is a copy kept for painting. The
 * alternative is resolving the profile inside hooks.server.ts before any
 * render, which would put a backend round trip in front of every page, or
 * applying the theme from JS after hydration, which means every load of a
 * dark profile starts with a white flash.
 */
export const THEME_COOKIE = 'theme';

export type Theme = 'light' | 'dark';

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

/**
 * The theme cookie, which carries no identity and is read by the client only
 * through the attribute it produces -- so the same attributes as the profile
 * cookie, Secure included, for the reason documented above it.
 */
export function themeCookieOptions(url: URL) {
	return profileCookieOptions(url);
}

/** Deleting a cookie has to match the attributes it was set with. */
export function clearProfileCookie(cookies: Cookies, url: URL): void {
	cookies.delete(PROFILE_COOKIE, {
		path: '/',
		secure: url.protocol === 'https:'
	});
	// Otherwise the picker, and then the next profile, inherit the theme of
	// whoever was signed in last.
	cookies.delete(THEME_COOKIE, {
		path: '/',
		secure: url.protocol === 'https:'
	});
}

/** The value `<html data-theme>` carries, which the token sheet keys off. */
export function themeOf(darkMode: boolean): Theme {
	return darkMode ? 'dark' : 'light';
}

export type Profile = {
	objectId: string;
	name: string;
	darkMode: boolean;
	weightUnit: 'kg' | 'lbs';
};

/**
 * Profiles, cached in the server process.
 *
 * The layout resolves the active profile on every page render, which was a
 * backend round trip per navigation for a value that essentially never
 * changes. The TTL is short because the things that invalidate it -- a
 * rename, a preference change -- drop the entry explicitly anyway.
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

/** Drops a profile from the cache, for deletes, renames and theme changes. */
export function forgetProfile(profileId: string): void {
	cache.delete(profileId);
}

/** What the backend returns for a profile. */
export type RawProfile = {
	object_id: string;
	name: string;
	dark_mode?: boolean;
	weight_unit?: 'kg' | 'lbs';
};

export function toProfile(raw: RawProfile): Profile {
	return {
		objectId: raw.object_id,
		name: raw.name,
		// Both absent on rows written before each field existed.
		darkMode: raw.dark_mode ?? false,
		weightUnit: raw.weight_unit ?? 'kg'
	};
}

/**
 * A profile by id, distinguishing the two failures that matter.
 *
 * `missing` means the backend answered 404 and the caller should stop
 * trusting the cookie naming it -- most obviously after `docker compose down
 * -v`, which empties the database and leaves the browser's cookie alone.
 * `unavailable` means the backend could not be reached at all, which a
 * restart causes and which must not log anybody out.
 */
export type ProfileLookup =
	{ status: 'ok'; profile: Profile } | { status: 'missing' } | { status: 'unavailable' };

export async function fetchProfile(profileId: string): Promise<ProfileLookup> {
	const cached = getCachedProfile(profileId);
	if (cached) {
		return { status: 'ok', profile: cached };
	}

	let response: Response;
	try {
		response = await fetch(`${env.HARD_API}/profiles/${profileId}`);
	} catch {
		return { status: 'unavailable' };
	}

	if (response.status === 404) {
		forgetProfile(profileId);
		return { status: 'missing' };
	}

	if (!response.ok) {
		return { status: 'unavailable' };
	}

	return { status: 'ok', profile: cacheProfile(toProfile(await response.json())) };
}

/**
 * Writes a profile's own fields, leaving everything else as stored.
 *
 * Profiles live outside the /api proxy routes -- those attach an X-Profile-Id
 * header and a profile is not owned by a profile -- so this talks to the
 * backend directly, as the picker's form actions do. The backend's PUT
 * replaces the whole object and refuses any change to the core attributes, so
 * the current profile is read first and sent back with only the named fields
 * altered.
 */
export async function patchProfile(
	profileId: string,
	changes: Partial<Pick<Profile, 'name' | 'darkMode' | 'weightUnit'>>
): Promise<{ ok: true; profile: Profile } | { ok: false; status: number; body: string }> {
	const current = await fetch(`${env.HARD_API}/profiles/${profileId}`);

	if (!current.ok) {
		return { ok: false, status: current.status, body: await current.text() };
	}

	const raw = await current.json();

	const updated = await fetch(`${env.HARD_API}/profiles/${profileId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...raw,
			...(changes.name === undefined ? {} : { name: changes.name }),
			...(changes.darkMode === undefined ? {} : { dark_mode: changes.darkMode }),
			...(changes.weightUnit === undefined ? {} : { weight_unit: changes.weightUnit })
		})
	});

	if (!updated.ok) {
		return { ok: false, status: updated.status, body: await updated.text() };
	}

	// The layout reads the profile from this cache on every render, so a stale
	// entry would undo the change on the next navigation for as long as the
	// TTL lasts.
	forgetProfile(profileId);

	return { ok: true, profile: cacheProfile(toProfile(await updated.json())) };
}
