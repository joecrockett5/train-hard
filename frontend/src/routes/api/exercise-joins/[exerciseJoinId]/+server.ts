import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { fromExerciseJoin, toExercise, toSet, type RawExercise } from '$lib/mapping';
import { type RawExerciseJoin, type RawSet } from '$lib/types';

/** The join, resolved into the exercise it points at, with that join's sets. */
export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) => {
		const join = await backendJson<RawExerciseJoin>(
			profileId,
			`/exercise-joins/${params.exerciseJoinId}`
		);

		const [exercise, sets] = await Promise.all([
			backendJson<RawExercise>(profileId, `/exercises/${join.exercise_id}`),
			backendJson<RawSet[]>(profileId, `/sets${query({ exercise: join.exercise_id })}`)
		]);

		return {
			// Name and description come from the exercise. This used to read
			// them from the join's non-existent `title` and `notes`.
			...toExercise(exercise),
			joinId: join.object_id,
			workoutId: join.workout_id,
			tags: [],
			sets: sets
				.filter((set) => set.exercise_join_id === join.object_id)
				.map(toSet)
		};
	});

export const PUT: RequestHandler = ({ params, request, locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawExerciseJoin>(
			profileId,
			// Previously read params.exercisejoinId, which does not exist --
			// the route parameter is [exerciseJoinId] -- so this requested
			// /exercise-joins/undefined.
			`/exercise-joins/${params.exerciseJoinId}`,
			{ method: 'PUT', json: fromExerciseJoin(await request.json()) }
		);
		return raw;
	});

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		backendJson<RawExerciseJoin>(profileId, `/exercise-joins/${params.exerciseJoinId}`, {
			method: 'DELETE'
		})
	);
