import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { fromTemplate, toTemplate, type RawTemplate } from '$lib/mapping';

export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		// Previously requested /exercises/{templateId}.
		toTemplate(await backendJson<RawTemplate>(profileId, `/templates/${params.templateId}`))
	);

export const PUT: RequestHandler = ({ params, request, locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawTemplate>(profileId, `/templates/${params.templateId}`, {
			method: 'PUT',
			json: fromTemplate(await request.json(), { forUpdate: true })
		});
		return toTemplate(raw);
	});

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toTemplate(
			await backendJson<RawTemplate>(profileId, `/templates/${params.templateId}`, {
				method: 'DELETE'
			})
		)
	);
