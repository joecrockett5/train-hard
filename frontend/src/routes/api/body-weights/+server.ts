import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { fromBodyWeight, toBodyWeight } from '$lib/mapping';
import { type RawBodyWeight } from '$lib/types';

export const GET: RequestHandler = ({ locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawBodyWeight[]>(profileId, '/body-weights');
		return raw.map(toBodyWeight);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawBodyWeight>(profileId, '/body-weights', {
				method: 'POST',
				json: fromBodyWeight(await request.json())
			});
			return toBodyWeight(raw);
		},
		201
	);
