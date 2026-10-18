import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { fromBodyWeight, toBodyWeight } from '$lib/mapping';
import { type RawBodyWeight } from '$lib/types';

export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toBodyWeight(
			await backendJson<RawBodyWeight>(profileId, `/body-weights/${params.bodyWeightId}`)
		)
	);

export const PUT: RequestHandler = ({ params, request, locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawBodyWeight>(
			profileId,
			`/body-weights/${params.bodyWeightId}`,
			{
				method: 'PUT',
				json: fromBodyWeight(await request.json(), { forUpdate: true })
			}
		);
		return toBodyWeight(raw);
	});

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toBodyWeight(
			await backendJson<RawBodyWeight>(profileId, `/body-weights/${params.bodyWeightId}`, {
				method: 'DELETE'
			})
		)
	);
