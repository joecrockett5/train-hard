import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { toTag } from '$lib/mapping';
import { type RawTag } from '$lib/types';

export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toTag(await backendJson<RawTag>(profileId, `/tags/${params.tagId}`))
	);

export const PUT: RequestHandler = ({ params, request, locals }) =>
	handle(locals, async (profileId) => {
		const body = await request.json();
		const raw = await backendJson<RawTag>(profileId, `/tags/${params.tagId}`, {
			method: 'PUT',
			json: {
				timestamp: body.timestamp,
				object_id: body.objectId,
				name: body.name,
				color_hex: body.colorHex
			}
		});
		return toTag(raw);
	});

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toTag(await backendJson<RawTag>(profileId, `/tags/${params.tagId}`, { method: 'DELETE' }))
	);
