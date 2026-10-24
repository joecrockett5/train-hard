import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	// Every photo record in one request, grouped by weigh-in on the page.
	// They carry no image data, so this is a list of small rows -- asking per
	// weigh-in would be one request per row on screen.
	const [response, photosResponse] = await Promise.all([
		fetch(`/api/body-weights`),
		fetch('/api/progress-photos')
	]);

	if (!response.ok) {
		throw new Error('Failed to fetch body weights');
	}

	const bodyWeights = await response.json();
	const photos = photosResponse.ok ? await photosResponse.json() : [];

	return {
		bodyWeights,
		photos
	};
}) satisfies PageServerLoad;
