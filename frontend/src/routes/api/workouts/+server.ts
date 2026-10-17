import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type WorkoutInfo } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Need to update backend to allow for filtering by workout_date
	// will then add tag support
	const date = url.searchParams.get('date');
	console.log('GET /api/workouts' + (date ? `?date=${date}` : ''));
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/workouts` + (date ? `?date=${date}` : ''), {
		headers: { 'X-Profile-Id': profileId }
	});
	const rawWorkouts = await response.json();
	const workouts: WorkoutInfo[] = [];
	for (const workout of rawWorkouts) {
		workouts.push({
			userId: workout.user_id,
			timestamp: workout.timestamp,
			objectType: workout.object_type,
			objectId: workout.object_id,
			workoutDate: workout.workout_date,
			notes: workout.notes,
			title: workout.title
		});
	}
	return new Response(JSON.stringify(workouts), {
		status: response.status
	});
};

export const POST: RequestHandler = async ({ url, request, locals }) => {
	console.log('POST /api/workouts');
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const json = await request.json();
	const formattedBody = {
		workout_date: json.workoutDate,
		notes: json.notes,
		title: json.title
	};
	const response = await fetch(`${env.HARD_API}/workouts`, {
		method: 'POST',
		headers: { 'X-Profile-Id': profileId, 'Content-Type': 'application/json' },
		body: JSON.stringify(formattedBody)
	});
	return response;
};
