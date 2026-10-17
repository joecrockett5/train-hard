import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { toTag } from '$lib/mapping';
import { type RawTag } from '$lib/types';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/tags${query({ target: url.searchParams.get('target') })}`;
		const raw = await backendJson<RawTag[]>(profileId, path);
		return raw.map(toTag);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const body = await request.json();
			const raw = await backendJson<RawTag>(profileId, '/tags', {
				method: 'POST',
				json: { name: body.name, color_hex: body.colorHex }
			});
			return toTag(raw);
		},
		201
	);
