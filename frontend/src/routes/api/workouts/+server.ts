import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { fromWorkout, toWorkoutInfo, type RawWorkout } from '$lib/mapping';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/workouts${query({ date: url.searchParams.get('date') })}`;
		const raw = await backendJson<RawWorkout[]>(profileId, path);
		return raw.map(toWorkoutInfo);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawWorkout>(profileId, '/workouts', {
				method: 'POST',
				json: fromWorkout(await request.json())
			});
			return toWorkoutInfo(raw);
		},
		201
	);
