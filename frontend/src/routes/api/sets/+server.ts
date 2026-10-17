import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type Set } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Need to update backend to allow for filtering by set_date
	// will then add tag support
	const workoutId = url.searchParams.get('workout');
	const exerciseId = url.searchParams.get('exercise');
	console.log(
		'GET /api/sets' +
			(workoutId ? '?workout=' + workoutId : '') +
			(exerciseId ? '&exercise=' + exerciseId : '')
	);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(
		`${env.HARD_API}/sets` +
			(workoutId ? '?workout=' + workoutId : '') +
			(exerciseId ? '&exercise=' + exerciseId : ''),
		{
			headers: { 'X-Profile-Id': profileId }
		}
	);
	const rawSets = await response.json();
	const sets: Set[] = [];
	for (const set of rawSets) {
		sets.push({
			userId: set.user_id,
			timestamp: set.timestamp,
			objectType: set.object_type,
			objectId: set.object_id,
			setType: set.set_type,
			weight: set.weight,
			weightUnit: set.unit,
			reps: set.reps,
			notes: set.notes,
			exerciseJoinId: set.exercise_join_id
		});
	}
	return new Response(JSON.stringify(sets), {
		status: response.status
	});
};

export const POST: RequestHandler = async ({ url, request, locals }) => {
	console.log('POST /api/sets');
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const json = await request.json();
	const formattedBody = {
		set_type: json.setType,
		weight: json.weight.toString().replace('+', '.'),
		unit: json.weightUnit,
		reps: json.reps.toString().replace('+', '.'),
		notes: json.notes,
		exercise_join_id: json.exerciseJoinId
	};
	const response = await fetch(`${env.HARD_API}/sets`, {
		method: 'POST',
		headers: { 'X-Profile-Id': profileId, 'Content-Type': 'application/json' },
		body: JSON.stringify(formattedBody)
	});
	const responseJson = await response.json();
	const formattedResponse = {
		objectId: responseJson.object_id,
		objectType: responseJson.object_type,
		timestamp: responseJson.timestamp,
		userId: responseJson.user_id,
		setType: responseJson.set_type,
		weight: responseJson.weight,
		weightUnit: responseJson.unit,
		reps: responseJson.reps,
		notes: responseJson.notes,
		exerciseJoinId: responseJson.exercise_join_id
	};
	return new Response(JSON.stringify(formattedResponse), {
		status: response.status
	});
};
