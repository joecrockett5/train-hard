import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type Template } from '$lib/types';

export const GET: RequestHandler = async ({ url, params, locals }) => {
	const { templateId } = params;
	console.log(`GET /api/templates/${templateId}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/exercises/${templateId}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const json = await response.json();
	const formattedBody: Template = {
		userId: json.user_id,
		timestamp: json.timestamp,
		objectType: json.object_type,
		objectId: json.object_id,
		name: json.name,
		description: json.description
	};
	return new Response(JSON.stringify(formattedBody), {
		status: response.status
	});
};

export const PUT: RequestHandler = async ({ url, params, request, locals }) => {
	const { templateId } = params;
	console.log(`PUT /api/templates/${templateId}`);
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
		description: json.description
	};
	const response = await fetch(`${env.HARD_API}/templates/${templateId}`, {
		method: 'PUT',
		headers: { 'X-Profile-Id': profileId, 'Content-Type': 'application/json' },
		body: JSON.stringify(formattedBody)
	});
	return response;
};

export const DELETE: RequestHandler = async ({ url, params, locals }) => {
	const { templateId } = params;
	console.log(`DELETE /api/templates/${templateId}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/templates/${templateId}`, {
		method: 'DELETE',
		headers: { 'X-Profile-Id': profileId }
	});
	return response;
};
