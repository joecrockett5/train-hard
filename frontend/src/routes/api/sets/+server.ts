import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { fromSet, toSet } from '$lib/mapping';
import { type RawSet } from '$lib/types';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/sets${query({
			workout: url.searchParams.get('workout'),
			exercise: url.searchParams.get('exercise')
		})}`;
		const raw = await backendJson<RawSet[]>(profileId, path);
		return raw.map(toSet);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawSet>(profileId, '/sets', {
				method: 'POST',
				json: fromSet(await request.json())
			});
			return toSet(raw);
		},
		201
	);
