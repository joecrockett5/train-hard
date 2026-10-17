import { redirect, type Handle } from '@sveltejs/kit';
import { PROFILE_COOKIE } from '$lib/server/profile';

/** Routes reachable without a profile selected. */
const UNGATED = ['/profiles'];

/** Anything with a file extension is an asset request, not an app route. */
const ASSET_PATH = /\.[a-z0-9]+$/i;

export const handle: Handle = async ({ event, resolve }) => {
	// Profiles are not password protected. The cookie only selects which data
	// partition the server-side API routes read and write, so there is nothing
	// here to verify -- just somewhere to put it that every route can reach.
	event.locals.profileId = event.cookies.get(PROFILE_COOKIE);

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

	return resolve(event);
};
