import { error, type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { fromTemplateJoin, toTemplateJoin } from '$lib/mapping';
import { type RawTemplateJoin } from '$lib/types';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/template-joins${query({
			exercise: url.searchParams.get('exercise'),
			template: url.searchParams.get('template')
		})}`;
		const raw = await backendJson<RawTemplateJoin[]>(profileId, path);
		return raw.map(toTemplateJoin);
	});

export const POST: RequestHandler = ({ request, locals }) =>
	handle(
		locals,
		async (profileId) => {
			const raw = await backendJson<RawTemplateJoin>(profileId, '/template-joins', {
				method: 'POST',
				json: fromTemplateJoin(await request.json())
			});
			return toTemplateJoin(raw);
		},
		201
	);

/** Removes the link between one template and one exercise. */
export const DELETE: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const template = url.searchParams.get('templateId') ?? url.searchParams.get('template');
		const exercise = url.searchParams.get('exerciseId') ?? url.searchParams.get('exercise');

		if (!template || !exercise) {
			error(400, 'Both template and exercise are required');
		}

		const raw = await backendJson<RawTemplateJoin>(
			profileId,
			`/template-joins${query({ template, exercise })}`,
			{ method: 'DELETE' }
		);
		return toTemplateJoin(raw);
	});
