import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type Tag } from '$lib/types';

export const GET: RequestHandler = async ({ url, params, locals }) => {
	const { tagId } = params;
	console.log(`GET /api/tags/${tagId}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/tags/${tagId}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const json = await response.json();
	const formattedBody: Tag = {
		userId: json.user_id,
		timestamp: json.timestamp,
		objectType: json.object_type,
		objectId: json.object_id,
		name: json.name,
		colorHex: json.color_hex
	};
	return new Response(JSON.stringify(formattedBody), {
		status: response.status,
		headers: response.headers
	});
};

export const PUT: RequestHandler = async ({ url, params, request, locals }) => {
	const { tagId } = params;
	console.log(`PUT /api/tags/${tagId}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const json = await request.json();
	const formattedBody = {
		timestamp: json.timestamp,
		object_id: json.objectId,
		name: json.name,
		color_hex: json.colorHex
	};
	const response = await fetch(`${env.HARD_API}/tags/${tagId}`, {
		method: 'PUT',
		headers: { 'X-Profile-Id': profileId },
		body: JSON.stringify(formattedBody)
	});
	return response;
};

export const DELETE: RequestHandler = async ({ url, params, locals }) => {
	const { tagId } = params;
	console.log(`DELETE /api/tags/${tagId}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/tags/${tagId}`, {
		method: 'DELETE',
		headers: { 'X-Profile-Id': profileId }
	});
	return response;
};
