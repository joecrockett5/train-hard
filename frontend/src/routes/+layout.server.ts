import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

/**
 * Resolves the active profile's display name for the nav. Failures are
 * swallowed: a missing name should not stop the app rendering, and the
 * /profiles page handles a genuinely unreachable backend.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.profileId) {
		return { profile: null };
	}

	try {
		const response = await fetch(`${env.HARD_API}/profiles/${locals.profileId}`);
		if (!response.ok) {
			return { profile: { objectId: locals.profileId, name: locals.profileId } };
		}
		const raw = await response.json();
		return { profile: { objectId: raw.object_id, name: raw.name } };
	} catch {
		return { profile: { objectId: locals.profileId, name: locals.profileId } };
	}
};
