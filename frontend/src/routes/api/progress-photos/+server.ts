import { error, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { backendJson, handle, query } from '$lib/server/backend';
import { toProgressPhoto } from '$lib/mapping';
import { type RawProgressPhoto } from '$lib/types';

export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const path = `/progress-photos${query({
			body_weight: url.searchParams.get('bodyWeight') ?? url.searchParams.get('body_weight')
		})}`;
		const raw = await backendJson<RawProgressPhoto[]>(profileId, path);
		return raw.map(toProgressPhoto);
	});

/**
 * Uploads one image as the request body.
 *
 * Not multipart: one file per request needs no form, and the backend image
 * carries no multipart parser on purpose. The bytes are read into memory
 * rather than streamed because they have already been shrunk on the device
 * to a few hundred KB, and streaming a body through `fetch` here would mean
 * half-duplex plumbing for no gain at that size.
 */
export const POST: RequestHandler = async ({ request, url, locals }) => {
	const profileId = locals.profileId;

	if (!profileId) {
		return new Response('No profile selected', { status: 401 });
	}

	const bodyWeight = url.searchParams.get('bodyWeight') ?? url.searchParams.get('body_weight');

	if (!bodyWeight) {
		error(400, 'bodyWeight is required');
	}

	const contentType = request.headers.get('content-type') ?? 'application/octet-stream';
	const data = await request.arrayBuffer();

	const response = await fetch(
		`${env.HARD_API}/progress-photos${query({
			body_weight: bodyWeight,
			width: url.searchParams.get('width'),
			height: url.searchParams.get('height')
		})}`,
		{
			method: 'POST',
			headers: { 'X-Profile-Id': profileId, 'Content-Type': contentType },
			body: data
		}
	);

	if (!response.ok) {
		return new Response(await response.text(), { status: response.status });
	}

	return new Response(JSON.stringify(toProgressPhoto(await response.json())), {
		status: 201,
		headers: { 'Content-Type': 'application/json' }
	});
};
