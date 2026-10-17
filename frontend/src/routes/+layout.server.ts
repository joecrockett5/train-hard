import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import { PROFILE_COOKIE } from '$lib/server/profile';
import type { LayoutServerLoad } from './$types';

/**
 * Resolves the active profile's display name for the nav.
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

	let response: Response;
	try {
		response = await fetch(`${env.HARD_API}/profiles/${locals.profileId}`);
	} catch {
		return { profile: { objectId: locals.profileId, name: locals.profileId } };
	}

	if (response.status === 404) {
		cookies.delete(PROFILE_COOKIE, { path: '/' });
		locals.profileId = undefined;

		if (url.pathname !== '/profiles') {
			redirect(307, '/profiles');
		}
		return { profile: null };
	}

	if (!response.ok) {
		return { profile: { objectId: locals.profileId, name: locals.profileId } };
	}

	const raw = await response.json();
	return { profile: { objectId: raw.object_id, name: raw.name } };
};
