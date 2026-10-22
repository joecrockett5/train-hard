import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	// Templates arrive with their tags already joined on; the tag list is for
	// the picker, which has to offer tags nothing is using yet.
	const [templatesResponse, tagsResponse] = await Promise.all([
		fetch('/api/templates'),
		fetch('/api/tags')
	]);

	if (!templatesResponse.ok) {
		throw new Error('Failed to fetch templates');
	}

	if (!tagsResponse.ok) {
		throw new Error('Failed to fetch tags');
	}

	return {
		templates: await templatesResponse.json(),
		tags: await tagsResponse.json()
	};
}) satisfies PageServerLoad;
