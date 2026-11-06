import { json, type RequestHandler } from '@sveltejs/kit';
import { patchProfile, THEME_COOKIE, themeCookieOptions, themeOf } from '$lib/server/profile';

/**
 * The active profile's own fields: its name, and its two display
 * preferences.
 *
 * One endpoint rather than one per field. They are the same
 * read-modify-write against the same object, and a second copy would be a
 * second place to get the cache invalidation and the theme cookie wrong.
 * It replaces `/api/preferences`, which could not carry the name.
 *
 * Note what is *not* here: changing the weight unit never converts anything.
 * Every weight in the database is kilograms and the unit only decides how one
 * is shown and how a typed number is read back.
 */
export const PUT: RequestHandler = async ({ request, locals, cookies, url }) => {
	const profileId = locals.profileId;

	if (!profileId) {
		return new Response('No profile selected', { status: 401 });
	}

	const { name, darkMode, weightUnit } = await request.json();

	if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
		return new Response('name must be a non-empty string', { status: 400 });
	}

	if (darkMode !== undefined && typeof darkMode !== 'boolean') {
		return new Response('darkMode must be a boolean', { status: 400 });
	}

	if (weightUnit !== undefined && weightUnit !== 'kg' && weightUnit !== 'lbs') {
		return new Response('weightUnit must be kg or lbs', { status: 400 });
	}

	if (name === undefined && darkMode === undefined && weightUnit === undefined) {
		return new Response('Nothing to change', { status: 400 });
	}

	const result = await patchProfile(profileId, {
		...(name === undefined ? {} : { name: name.trim() }),
		...(darkMode === undefined ? {} : { darkMode }),
		...(weightUnit === undefined ? {} : { weightUnit })
	});

	if (!result.ok) {
		return new Response(result.body, { status: result.status });
	}

	// So the next full page load paints in the theme that was just chosen,
	// rather than the one the cookie was holding.
	cookies.set(THEME_COOKIE, themeOf(result.profile.darkMode), themeCookieOptions(url));

	return json(result.profile);
};
