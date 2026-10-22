import { error } from '@sveltejs/kit';
import type { Exercise, Tag, Template } from '$lib/types';
import type { PageServerLoad } from './$types';

type DetailResponse = {
	template: Template;
	exercises: Exercise[];
	allExercises: Exercise[];
};

export const load = (async ({ fetch, params }) => {
	// One request for the page, as the workout page does it. The tags are a
	// second: the exercises carry their own, but creating one from the picker
	// has to offer every tag, including unused ones.
	const [response, tagsResponse] = await Promise.all([
		fetch(`/api/templates/${params.templateId}/detail`),
		fetch('/api/tags')
	]);

	if (!response.ok) {
		error(response.status, `Could not load template ${params.templateId}`);
	}

	const tags: Tag[] = tagsResponse.ok ? await tagsResponse.json() : [];
	const { template, exercises, allExercises }: DetailResponse = await response.json();

	return { template, exercises, allExercises, tags };
}) satisfies PageServerLoad;
