import { redirect } from '@sveltejs/kit';
import {
	clearProfileCookie,
	fetchProfile,
	THEME_COOKIE,
	themeCookieOptions
} from '$lib/server/profile';
import type { LayoutServerLoad } from './$types';

/**
 * Resolves the active profile for the nav, and keeps the theme cookie
 * honest.
 *
 * A cookie can outlive the profile it names -- most obviously after a
 * `docker compose down -v`, which empties the database but leaves the
 * browser's cookie alone. A 404 therefore clears the cookie and sends the
 * user back to the picker rather than leaving them on a dead profile.
 *
 * Transport failures are treated differently: a backend that is merely
 * restarting should not log anyone out, so those fall back to showing the
 * raw id and keep the cookie.
 */
export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	if (!locals.profileId) {
		return { profile: null };
	}

	const lookup = await fetchProfile(locals.profileId);

	if (lookup.status === 'missing') {
		clearProfileCookie(cookies, url);
		locals.profileId = undefined;

		if (url.pathname !== '/profiles') {
			redirect(307, '/profiles');
		}
		return { profile: null };
	}

	if (lookup.status === 'unavailable') {
		return {
			profile: {
				objectId: locals.profileId,
				name: locals.profileId,
				darkMode: false,
				weightUnit: 'kg' as const
			}
		};
	}

	// The cookie is only a copy of the profile's preference, so correct it
	// whenever it has drifted -- the profile was changed from another browser,
	// or this one was selected before the preference was known. The page being
	// rendered right now already used the old value; the next one will not.
	const theme = lookup.profile.darkMode ? 'dark' : 'light';
	if (cookies.get(THEME_COOKIE) !== theme) {
		cookies.set(THEME_COOKIE, theme, themeCookieOptions(url));
	}

	return { profile: lookup.profile };
};
