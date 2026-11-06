import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	// Every photo record in one request, grouped by weigh-in on the page.
	// They carry no image data, so this is a list of small rows -- asking per
	// weigh-in would be one request per row on screen.
	const [response, photosResponse] = await Promise.all([
		fetch('/api/body-weights'),
		fetch('/api/progress-photos')
	]);

	if (!response.ok) {
		throw new Error(`Could not load weigh-ins (${response.status})`);
	}

	return {
		bodyWeights: await response.json(),
		photos: photosResponse.ok ? await photosResponse.json() : []
	};
}) satisfies PageServerLoad;
