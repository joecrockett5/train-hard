import { env } from '$env/dynamic/private';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import {
	cacheProfile,
	clearProfileCookie,
	fetchProfile,
	forgetProfile,
	PROFILE_COOKIE,
	profileCookieOptions,
	THEME_COOKIE,
	themeCookieOptions,
	toProfile
} from '$lib/server/profile';
import type { PageServerLoad } from './$types';

type BackendProfile = {
	object_id: string;
	name: string;
	timestamp: string;
	dark_mode?: boolean;
};

export type Profile = {
	objectId: string;
	name: string;
};

/**
 * Profiles are the one resource read without a profile selected, so this talks
 * to the backend directly rather than through the /api proxy routes (which all
 * require locals.profileId).
 */
async function listProfiles(): Promise<Profile[]> {
	const response = await fetch(`${env.HARD_API}/profiles`);

	if (!response.ok) {
		throw new Error(`Backend returned ${response.status} listing profiles`);
	}

	const raw: BackendProfile[] = await response.json();
	return raw
		.map((profile) => ({ objectId: profile.object_id, name: profile.name }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export const load: PageServerLoad = async ({ locals, url }) => {
	let profiles: Profile[] = [];
	let error: string | null = null;

	try {
		profiles = await listProfiles();
	} catch (e) {
		// Render the page with the error rather than a 500: the backend may
		// still be starting, and a reload is the obvious remedy.
		error = e instanceof Error ? e.message : String(e);
	}

	return {
		profiles,
		error,
		activeProfileId: locals.profileId ?? null,
		redirectTo: url.searchParams.get('redirectTo') ?? '/'
	};
};

export const actions: Actions = {
	select: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const profileId = String(data.get('profileId') ?? '');
		const redirectTo = String(data.get('redirectTo') ?? '/');

		if (!profileId) {
			return fail(400, { message: 'Pick a profile' });
		}

		forgetProfile(profileId);
		cookies.set(PROFILE_COOKIE, profileId, profileCookieOptions(url));

		// Resolve the profile now rather than letting the layout do it after
		// the redirect: the cost is the same lookup either way, but doing it
		// here means the page we redirect to is painted in the right theme
		// instead of flashing the previous profile's.
		const lookup = await fetchProfile(profileId);
		cookies.set(
			THEME_COOKIE,
			lookup.status === 'ok' && lookup.profile.darkMode ? 'dark' : 'light',
			themeCookieOptions(url)
		);

		redirect(303, redirectTo);
	},

	create: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const redirectTo = String(data.get('redirectTo') ?? '/');

		if (!name) {
			return fail(400, { message: 'Give the profile a name' });
		}

		const response = await fetch(`${env.HARD_API}/profiles`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});

		if (!response.ok) {
			return fail(response.status, {
				message: `Could not create profile (${response.status})`
			});
		}

		// Through the shared mapper, so a new preference field does not need
		// remembering in a second place.
		const created = cacheProfile(toProfile(await response.json()));
		cookies.set(PROFILE_COOKIE, created.objectId, profileCookieOptions(url));
		cookies.set(THEME_COOKIE, 'light', themeCookieOptions(url));
		redirect(303, redirectTo);
	},

	switch: async ({ cookies, url }) => {
		clearProfileCookie(cookies, url);
		redirect(303, '/profiles');
	}
};
