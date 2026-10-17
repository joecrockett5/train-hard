import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { fromExercise, toExercise, type RawExercise } from '$lib/mapping';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/exercises${query({ workout: url.searchParams.get('workout') })}`;
		const raw = await backendJson<RawExercise[]>(profileId, path);
		return raw.map(toExercise);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawExercise>(profileId, '/exercises', {
				method: 'POST',
				json: fromExercise(await request.json())
			});
			return toExercise(raw);
		},
		201
	);
