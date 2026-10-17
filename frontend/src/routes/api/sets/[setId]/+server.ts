import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { fromSet, toSet } from '$lib/mapping';
import { type RawSet } from '$lib/types';

export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toSet(await backendJson<RawSet>(profileId, `/sets/${params.setId}`))
	);

export const PUT: RequestHandler = ({ params, request, locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawSet>(profileId, `/sets/${params.setId}`, {
			method: 'PUT',
			json: fromSet(await request.json(), { forUpdate: true })
		});
		return toSet(raw);
	});

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toSet(await backendJson<RawSet>(profileId, `/sets/${params.setId}`, { method: 'DELETE' }))
	);
