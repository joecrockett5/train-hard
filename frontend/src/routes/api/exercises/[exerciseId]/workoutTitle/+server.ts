import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { type RawWorkout } from '$lib/mapping';
import { type RawExerciseJoin } from '$lib/types';

/**
 * The title of the workout an exercise belongs to.
 *
 * This used to fetch /exercises/{id} and read a `workout_id` off it. An
 * Exercise has no workout_id -- the link lives on the ExerciseJoin -- so the
 * follow-up request was always /workouts/undefined.
 */
export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) => {
		const joins = await backendJson<RawExerciseJoin[]>(
			profileId,
			`/exercise-joins${query({ exercise: params.exerciseId })}`
		);

		if (joins.length === 0) {
			return { workoutTitle: null };
		}

		const mostRecent = joins
			.slice()
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

		const workout = await backendJson<RawWorkout>(
			profileId,
			`/workouts/${mostRecent.workout_id}`
		);

		return { workoutTitle: workout.title };
	});
