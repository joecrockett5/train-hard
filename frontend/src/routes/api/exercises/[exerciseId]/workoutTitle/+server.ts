import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, params, locals }) => {
	const { exerciseId } = params;
	console.log(`GET /api/exercises/${exerciseId}/workoutTitle`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const joinResponse = await fetch(`${env.HARD_API}/exercises/${exerciseId}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const joinJson = await joinResponse.json();
	const workoutResponse = await fetch(`${env.HARD_API}/workouts/${joinJson.workout_id}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const workoutJson = await workoutResponse.json();
	const formattedBody = {
		workoutTitle: workoutJson.title
	};
	return new Response(JSON.stringify(formattedBody), {
		status: 200
	});
};
