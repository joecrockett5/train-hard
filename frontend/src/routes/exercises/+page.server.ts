import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	// Exercises arrive with their tags already joined on; the tag list is for
	// the picker, which has to offer tags nothing is using yet.
	const [exercisesResponse, tagsResponse] = await Promise.all([
		fetch('/api/exercises'),
		fetch('/api/tags')
	]);

	if (!exercisesResponse.ok) {
		throw new Error(`Could not load exercises (${exercisesResponse.status})`);
	}

	return {
		exercises: await exercisesResponse.json(),
		tags: tagsResponse.ok ? await tagsResponse.json() : []
	};
}) satisfies PageServerLoad;
