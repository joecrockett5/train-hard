import { redirect, type Handle } from '@sveltejs/kit';

export const PROFILE_COOKIE = 'profileId';

/** Routes reachable without a profile selected. */
const UNGATED = ['/profiles', '/health'];

export const handle: Handle = async ({ event, resolve }) => {
	// Profiles are not password protected. The cookie only selects which data
	// partition the server-side API routes read and write, so there is nothing
	// here to verify -- just somewhere to put it that every route can reach.
	event.locals.profileId = event.cookies.get(PROFILE_COOKIE);

	const { pathname } = event.url;
	const ungated = UNGATED.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);

	if (!event.locals.profileId && !ungated) {
		// API routes answer 401 so fetches fail loudly instead of being handed
		// the picker's HTML; pages redirect to the picker.
		if (pathname.startsWith('/api/')) {
			return new Response('No profile selected', { status: 401 });
		}
		redirect(307, `/profiles?redirectTo=${encodeURIComponent(event.url.pathname)}`);
	}

	return resolve(event);
};
