import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';
import {
	cacheProfile,
	forgetProfile,
	THEME_COOKIE,
	themeCookieOptions,
	toProfile
} from '$lib/server/profile';

/**
 * Stores the active profile's theme.
 *
 * Profiles live outside the /api proxy routes -- those all attach an
 * X-Profile-Id header and a profile is not owned by a profile -- so this
 * talks to the backend directly, the way the picker's actions do.
 *
 * The backend's PUT replaces the whole object and rejects any change to the
 * core attributes, so the current profile is read first and sent back with
 * only `dark_mode` altered. That is two round trips for one toggle, which is
 * acceptable for something clicked rarely and by hand.
 */
export const PUT: RequestHandler = async ({ request, locals, cookies, url }) => {
	const profileId = locals.profileId;

	if (!profileId) {
		return new Response('No profile selected', { status: 401 });
	}

	const { darkMode } = await request.json();

	if (typeof darkMode !== 'boolean') {
		return new Response('darkMode must be a boolean', { status: 400 });
	}

	const current = await fetch(`${env.HARD_API}/profiles/${profileId}`);

	if (!current.ok) {
		return new Response(await current.text(), { status: current.status });
	}

	const raw = await current.json();

	const updated = await fetch(`${env.HARD_API}/profiles/${profileId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...raw, dark_mode: darkMode })
	});

	if (!updated.ok) {
		return new Response(await updated.text(), { status: updated.status });
	}

	// The layout reads the profile from this cache on every render, so a stale
	// entry would undo the toggle on the next navigation for as long as the
	// TTL lasts.
	forgetProfile(profileId);
	const profile = cacheProfile(toProfile(await updated.json()));

	cookies.set(THEME_COOKIE, profile.darkMode ? 'dark' : 'light', themeCookieOptions(url));

	return json({ darkMode: profile.darkMode });
};
