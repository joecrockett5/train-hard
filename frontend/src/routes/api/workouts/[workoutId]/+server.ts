import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { fromWorkout, toWorkoutInfo, type RawWorkout } from '$lib/mapping';

export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toWorkoutInfo(await backendJson<RawWorkout>(profileId, `/workouts/${params.workoutId}`))
	);

export const PUT: RequestHandler = ({ params, request, locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawWorkout>(profileId, `/workouts/${params.workoutId}`, {
			method: 'PUT',
			json: fromWorkout(await request.json(), { forUpdate: true })
		});
		return toWorkoutInfo(raw);
	});

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toWorkoutInfo(
			await backendJson<RawWorkout>(profileId, `/workouts/${params.workoutId}`, {
				method: 'DELETE'
			})
		)
	);
