import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { toTemplateJoin } from '$lib/mapping';
import { type RawTemplateJoin } from '$lib/types';

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toTemplateJoin(
			await backendJson<RawTemplateJoin>(profileId, `/template-joins/${params.templateJoinId}`, {
				method: 'DELETE'
			})
		)
	);
