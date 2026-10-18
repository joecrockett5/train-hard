import { error, type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { fromTagJoin, toTagJoin } from '$lib/mapping';
import { type RawTagJoin } from '$lib/types';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/tag-joins${query({ target: url.searchParams.get('target') })}`;
		const raw = await backendJson<RawTagJoin[]>(profileId, path);
		return raw.map(toTagJoin);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawTagJoin>(profileId, '/tag-joins', {
				method: 'POST',
				json: fromTagJoin(await request.json())
			});
			return toTagJoin(raw);
		},
		201
	);

/**
 * Removes one tag from one target.
 *
 * Keyed by the pair rather than the join's own id, because untagging starts
 * from the tag and the thing tagged and nothing in the UI knows the join.
 */
export const DELETE: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const target = url.searchParams.get('targetId') ?? url.searchParams.get('target');
		const tag = url.searchParams.get('tagId') ?? url.searchParams.get('tag');

		if (!target || !tag) {
			error(400, 'Both target and tag are required');
		}

		const raw = await backendJson<RawTagJoin>(profileId, `/tag-joins${query({ target, tag })}`, {
			method: 'DELETE'
		});
		return toTagJoin(raw);
	});
