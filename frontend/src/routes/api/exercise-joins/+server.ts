import { error, type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { fromExerciseJoin, toExerciseJoin } from '$lib/mapping';
import { type RawExerciseJoin } from '$lib/types';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/exercise-joins${query({
			exercise: url.searchParams.get('exercise'),
			workout: url.searchParams.get('workout')
		})}`;
		const raw = await backendJson<RawExerciseJoin[]>(profileId, path);
		return raw.map(toExerciseJoin);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawExerciseJoin>(profileId, '/exercise-joins', {
				method: 'POST',
				json: fromExerciseJoin(await request.json())
			});
			return toExerciseJoin(raw);
		},
		201
	);

/** Removes the join between one workout and one exercise, and its sets. */
export const DELETE: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const workout = url.searchParams.get('workoutId') ?? url.searchParams.get('workout');
		const exercise = url.searchParams.get('exerciseId') ?? url.searchParams.get('exercise');

		if (!workout || !exercise) {
			error(400, 'Both workout and exercise are required');
		}

		const raw = await backendJson<RawExerciseJoin>(
			profileId,
			`/exercise-joins${query({ workout, exercise })}`,
			{ method: 'DELETE' }
		);
		return toExerciseJoin(raw);
	});
