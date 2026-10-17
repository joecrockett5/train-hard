import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type Exercise } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Need to update backend to allow for filtering by exercise_date
	// will then add tag support
	console.log('GET /api/exercises');
	const profileId = locals.profileId;
	const workout = url.searchParams.get('workout');
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/exercises` + (workout ? `?workout=${workout}` : ''), {
		method: 'GET',
		headers: { 'X-Profile-Id': profileId }
	});
	const rawexercises = await response.json();
	const exercises: Exercise[] = [];
	for (const exercise of rawexercises) {
		exercises.push({
			userId: exercise.user_id,
			timestamp: exercise.timestamp,
			objectType: exercise.object_type,
			objectId: exercise.object_id,
			name: exercise.name,
			description: exercise.description ?? ''
		});
	}
	return new Response(JSON.stringify(exercises), {
		status: response.status
	});
};

export const POST: RequestHandler = async ({ url, request, locals }) => {
	console.log('POST /api/exercises');
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const json = await request.json();
	const formattedBody = {
		name: json.name,
		description: json.description
	};
	const response = await fetch(`${env.HARD_API}/exercises`, {
		method: 'POST',
		headers: { 'X-Profile-Id': profileId, 'Content-Type': 'application/json' },
		body: JSON.stringify(formattedBody)
	});
	return response;
};
