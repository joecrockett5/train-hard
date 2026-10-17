import type { Exercise, WorkoutInfo, Set } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load = (async ({ fetch, params }) => {
	const workoutId = params.workoutId;
	const response = await fetch(`/api/workouts/${workoutId}`);

	if (!response.ok) {
		throw new Error('Failed to fetch exercises');
	}

	const workoutInfo: WorkoutInfo = await response.json();

	const exercisesResponse = await fetch(
		`/api/exercises?workout=${workoutInfo.objectId}`
	);
	const exercises: Exercise[] = await exercisesResponse.json();

	const possibilitiesResponse = await fetch(`/api/exercises`);
	const allExercises: Exercise[] = await possibilitiesResponse.json();

	console.log(`workout: ${workoutInfo.title}, found ${exercises.length} exercises`);

	for (const exercise of exercises) {
		const setsResponse = await fetch(
			`/api/sets?workout=${workoutInfo.objectId}&exercise=${exercise.objectId}`
		);
		const sets: Set[] = await setsResponse.json();
		console.log(
			`found ${sets.length} sets for ${exercise.name} from /api/sets?workout=${workoutInfo.objectId}&exercise=${exercise.objectId}`
		);
		exercise.sets = sets;
	}

	exercises.sort((a, b) => {
		// `sets` is optional on Exercise; it is assigned just above, but only
		// for exercises the sets request succeeded for.
		const aSets = a.sets ?? [];
		const bSets = b.sets ?? [];

		const aHasSets = aSets.length > 0;
		const bHasSets = bSets.length > 0;

		// Objects with at least one set come first
		if (aHasSets && !bHasSets) return -1;
		if (!aHasSets && bHasSets) return 1;
		if (!aHasSets && !bHasSets) return 0;

		// Both have sets; compare the date on the 0th element.
		const dateA = new Date(aSets[0].timestamp ?? 0).getTime();
		const dateB = new Date(bSets[0].timestamp ?? 0).getTime();
		return dateA - dateB;
	});

	return {
		workoutInfo,
		exercises,
		allExercises
	};
}) satisfies PageServerLoad;
