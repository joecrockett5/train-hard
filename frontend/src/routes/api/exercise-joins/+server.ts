import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type Exercise } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Need to update backend to allow for filtering by exercisejoin_date
	// will then add tag support
	const exerciseId = url.searchParams.get('exercise');
	const workoutId = url.searchParams.get('workout');

	// See the note in api/sets/+server.ts: concatenating a hardcoded '?' and
	// '&' broke whenever only the second parameter was present.
	const query = new URLSearchParams();
	if (exerciseId) query.set('exercise', exerciseId);
	if (workoutId) query.set('workout', workoutId);
	const suffix = query.size ? `?${query}` : '';

	console.log(`GET /api/exercise-joins${suffix}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/exercise-joins${suffix}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const rawExerciseJoins = await response.json();
	const exerciseJoins = [];
	for (const join of rawExerciseJoins) {
		exerciseJoins.push({
			userId: join.user_id,
			timestamp: join.timestamp,
			objectType: join.object_type,
			objectId: join.object_id,
			exerciseId: join.exercise_id,
			workoutId: join.workout_id
		});
	}
	return new Response(JSON.stringify(exerciseJoins), {
		status: response.status
	});
};

export const POST: RequestHandler = async ({ url, request, locals }) => {
	console.log('POST /api/exercise-joins');
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const json = await request.json();
	const formattedBody = {
		workout_id: json.workoutId,
		exercise_id: json.exerciseId
	};
	const response = await fetch(`${env.HARD_API}/exercise-joins`, {
		method: 'POST',
		headers: { 'X-Profile-Id': profileId, 'Content-Type': 'application/json' },
		body: JSON.stringify(formattedBody)
	});
	return response;
};

export const DELETE: RequestHandler = async ({ url, request, locals }) => {
	const workoutId = url.searchParams.get('workoutId');
	const exerciseId = url.searchParams.get('exerciseId');
	console.log('DELETE /api/exercise-joins?workoutId=' + workoutId + '&exerciseId=' + exerciseId);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(
		`${env.HARD_API}/exercise-joins?workout=${workoutId}&exercise=${exerciseId}`,
		{
			method: 'DELETE',
			headers: { 'X-Profile-Id': profileId }
		}
	);
	return response;
};
