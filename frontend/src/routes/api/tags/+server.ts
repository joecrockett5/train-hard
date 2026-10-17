import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type RawTag, type Tag } from '$lib/types';
import { getTags, postTags } from '$lib/tag-helpers';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Need to update backend to allow for filtering by tag_date
	// will then add tag support
	console.log('GET /api/tags');
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/tags`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const rawtags: RawTag[] = await response.json();
	const tags: Tag[] = [];
	rawtags.forEach((tag) => {
		tags.push({
			userId: tag.user_id,
			timestamp: tag.timestamp,
			objectType: tag.object_type,
			objectId: tag.object_id,
			name: tag.name,
			colorHex: tag.color_hex
		});
	});
	return new Response(JSON.stringify(tags), {
		status: response.status,
		headers: response.headers
	});
};

export const POST: RequestHandler = async ({ url, request, locals }) => {
	console.log('POST /api/tags');
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const json = await request.json();
	const formattedBody = {
		name: json.name,
		color_hex: json.colorHex
	};
	const response = await fetch(`${env.HARD_API}/tags`, {
		method: 'POST',
		headers: { 'X-Profile-Id': profileId },
		body: JSON.stringify(formattedBody)
	});
	return response;
};
