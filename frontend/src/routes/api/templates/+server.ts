import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { fromTemplate, toTemplate, type RawTemplate } from '$lib/mapping';

export const GET: RequestHandler = ({ locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawTemplate[]>(profileId, '/templates');
		return raw.map(toTemplate);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawTemplate>(profileId, '/templates', {
				method: 'POST',
				json: fromTemplate(await request.json())
			});
			return toTemplate(raw);
		},
		201
	);
