import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	const response = await fetch(`/api/exercises`);

	if (!response.ok) {
		throw new Error('Failed to fetch exercises');
	}

	const exercises = await response.json();
	console.log('exercises: ', exercises);

	return {
		exercises
	};
}) satisfies PageServerLoad;
