import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	// Templates arrive with their tags already joined on; the tag list is for
	// the picker, which has to offer tags nothing is using yet.
	const [templatesResponse, tagsResponse] = await Promise.all([
		fetch('/api/templates'),
		fetch('/api/tags')
	]);

	if (!templatesResponse.ok) {
		throw new Error(`Could not load templates (${templatesResponse.status})`);
	}

	return {
		templates: await templatesResponse.json(),
		tags: tagsResponse.ok ? await tagsResponse.json() : []
	};
}) satisfies PageServerLoad;
