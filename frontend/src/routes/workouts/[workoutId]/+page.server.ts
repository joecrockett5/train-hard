import { error } from '@sveltejs/kit';
import type { Exercise, Tag, Template, WorkoutInfo } from '$lib/types';
import type { PageServerLoad } from './$types';

type DetailResponse = {
	workoutInfo: WorkoutInfo;
	exercises: Exercise[];
	allExercises: Exercise[];
};

export const load = (async ({ fetch, params }) => {
	// One request for the page. This used to be three, plus one per exercise
	// for its sets, each of which became one or two further backend calls.
	// The tags are a second: the exercises carry their own, but creating one
	// from the picker has to offer every tag, including unused ones.
	const [response, tagsResponse, templatesResponse] = await Promise.all([
		fetch(`/api/workouts/${params.workoutId}/detail`),
		fetch('/api/tags'),
		fetch('/api/templates')
	]);

	if (!response.ok) {
		error(response.status, `Could not load workout ${params.workoutId}`);
	}

	const tags: Tag[] = tagsResponse.ok ? await tagsResponse.json() : [];
	// Empty rather than fatal: without templates the picker simply offers
	// none, which is what a profile that has made none sees.
	const templates: Template[] = templatesResponse.ok ? await templatesResponse.json() : [];

	const { workoutInfo, exercises, allExercises }: DetailResponse = await response.json();

	exercises.sort((a, b) => {
		const aSets = a.sets ?? [];
		const bSets = b.sets ?? [];

		const aHasSets = aSets.length > 0;
		const bHasSets = bSets.length > 0;

		// Exercises with at least one set come first.
		if (aHasSets && !bHasSets) return -1;
		if (!aHasSets && bHasSets) return 1;
		if (!aHasSets && !bHasSets) return 0;

		// Both have sets; order by when the first set was logged.
		return (
			new Date(aSets[0].timestamp ?? 0).getTime() - new Date(bSets[0].timestamp ?? 0).getTime()
		);
	});

	return { workoutInfo, exercises, allExercises, tags, templates };
}) satisfies PageServerLoad;
