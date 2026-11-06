import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PROFILE_COOKIE, THEME_COOKIE } from '$lib/server/profile';
import { DEFAULT_LOCALE, isLocale, localeTag, setLocale } from '$lib/i18n';

/** Routes reachable without a profile selected. */
const UNGATED = ['/profiles'];

/** Anything with a file extension is an asset request, not an app route. */
const ASSET_PATH = /\.[a-z0-9]+$/i;

/**
 * The browser chrome's colour, per theme.
 *
 * Fixed at one value it is wrong in one of the two: a light status bar above
 * a dark app, or the reverse. These are `--surface` from each theme.
 */
const THEME_COLOUR = { light: '#fbfaf9', dark: '#14110f' } as const;

/**
 * The UI language, chosen once for the server process.
 *
 * `main` and `japanese` were two branches of the same app because the strings
 * lived in the markup. They are a catalogue now, so the language is a setting
 * rather than a checkout -- see src/lib/i18n.
 */
const configured = env.UI_LOCALE;
setLocale(isLocale(configured) ? configured : DEFAULT_LOCALE);

export const handle: Handle = async ({ event, resolve }) => {
	// Profiles are not password protected. The cookie only selects which data
	// partition the server-side API routes read and write, so there is nothing
	// here to verify -- just somewhere to put it that every route can reach.
	event.locals.profileId = event.cookies.get(PROFILE_COOKIE);

	// Read from a cookie rather than resolved from the profile, so that
	// putting the theme on <html> costs nothing. See THEME_COOKIE.
	event.locals.theme = event.cookies.get(THEME_COOKIE) === 'dark' ? 'dark' : 'light';
	event.locals.locale = isLocale(configured) ? configured : DEFAULT_LOCALE;

	const { pathname } = event.url;
	const ungated =
		ASSET_PATH.test(pathname) ||
		UNGATED.some((route) => pathname === route || pathname.startsWith(`${route}/`));

	if (!event.locals.profileId && !ungated) {
		// API routes answer 401 so fetches fail loudly instead of being handed
		// the picker's HTML; pages redirect to the picker.
		if (pathname.startsWith('/api/')) {
			return new Response('No profile selected', { status: 401 });
		}
		redirect(307, `/profiles?redirectTo=${encodeURIComponent(pathname)}`);
	}

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace('%theme%', event.locals.theme)
				.replace('%themeColor%', THEME_COLOUR[event.locals.theme])
				.replace('%lang%', localeTag(event.locals.locale))
	});
};
