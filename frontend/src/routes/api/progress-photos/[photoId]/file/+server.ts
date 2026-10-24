import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';

/**
 * The image itself.
 *
 * Passes the backend's bytes and its caching headers straight through: the
 * file is named by a row id and never changes, so once a device has it there
 * is no reason to ask again.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const profileId = locals.profileId;

	if (!profileId) {
		return new Response('No profile selected', { status: 401 });
	}

	const response = await fetch(`${env.HARD_API}/progress-photos/${params.photoId}/file`, {
		headers: { 'X-Profile-Id': profileId }
	});

	if (!response.ok) {
		return new Response(await response.text(), { status: response.status });
	}

	return new Response(await response.arrayBuffer(), {
		status: 200,
		headers: {
			'Content-Type': response.headers.get('content-type') ?? 'application/octet-stream',
			'Cache-Control': response.headers.get('cache-control') ?? 'private, max-age=31536000'
		}
	});
};
