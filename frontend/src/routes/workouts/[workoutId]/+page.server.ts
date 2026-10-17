import { error } from '@sveltejs/kit';
import type { Exercise, WorkoutInfo } from '$lib/types';
import type { PageServerLoad } from './$types';

type DetailResponse = {
	workoutInfo: WorkoutInfo;
	exercises: Exercise[];
	allExercises: Exercise[];
};

export const load = (async ({ fetch, params }) => {
	// One request. This used to be three, plus one per exercise for its sets,
	// each of which became one or two further backend calls.
	const response = await fetch(`/api/workouts/${params.workoutId}/detail`);

	if (!response.ok) {
		error(response.status, `Could not load workout ${params.workoutId}`);
	}

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

	return { workoutInfo, exercises, allExercises };
}) satisfies PageServerLoad;
