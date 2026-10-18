import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	const response = await fetch(`/api/body-weights`);

	if (!response.ok) {
		throw new Error('Failed to fetch body weights');
	}

	const bodyWeights = await response.json();

	return {
		bodyWeights
	};
}) satisfies PageServerLoad;
