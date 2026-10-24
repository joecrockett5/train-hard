import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	// The same two requests the weights page makes, and for the same reason:
	// the photo rows carry no image data, so every one of them arrives in a
	// single request and the picker needs no endpoint of its own.
	const [response, photosResponse] = await Promise.all([
		fetch('/api/body-weights'),
		fetch('/api/progress-photos')
	]);

	if (!response.ok) {
		throw new Error('Failed to fetch body weights');
	}

	return {
		bodyWeights: await response.json(),
		photos: photosResponse.ok ? await photosResponse.json() : []
	};
}) satisfies PageServerLoad;
