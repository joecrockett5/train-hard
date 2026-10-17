import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { fromExercise, toExercise, type RawExercise } from '$lib/mapping';

export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toExercise(await backendJson<RawExercise>(profileId, `/exercises/${params.exerciseId}`))
	);

export const PUT: RequestHandler = ({ params, request, locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawExercise>(profileId, `/exercises/${params.exerciseId}`, {
			method: 'PUT',
			json: fromExercise(await request.json(), { forUpdate: true })
		});
		return toExercise(raw);
	});

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toExercise(
			await backendJson<RawExercise>(profileId, `/exercises/${params.exerciseId}`, {
				method: 'DELETE'
			})
		)
	);
