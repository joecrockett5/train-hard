import { type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle } from '$lib/server/backend';
import { toProgressPhoto } from '$lib/mapping';
import { type RawProgressPhoto } from '$lib/types';

export const DELETE: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) =>
		toProgressPhoto(
			await backendJson<RawProgressPhoto>(profileId, `/progress-photos/${params.photoId}`, {
				method: 'DELETE'
			})
		)
	);
