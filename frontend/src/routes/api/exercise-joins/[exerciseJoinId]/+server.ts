import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { type Exercise } from '$lib/types';

export const GET: RequestHandler = async ({ url, params, locals }) => {
	const { exerciseJoinId } = params;
	console.log(`GET /api/exercise-joins/${exerciseJoinId}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/exercise-joins/${exerciseJoinId}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const exerciseJoin = await response.json();

	const exerciseResponse = await fetch(`${env.HARD_API}/exercises/${exerciseJoin.exercise_id}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const exerciseData = await exerciseResponse.json();

	const setsResponse = await fetch(`${env.HARD_API}/sets?exercise=${exerciseJoin.exercise_id}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const setsData = await setsResponse.json();

	const formattedBody = {
		userId: exerciseJoin.user_id,
		timestamp: exerciseJoin.timestamp,
		objectType: exerciseData.object_type,
		objectId: exerciseData.object_id,
		joinId: exerciseJoin.object_id,
		workoutId: exerciseJoin.workout_id,
		name: exerciseJoin.title,
		description: exerciseJoin.notes,
		tags: exerciseTags,
		sets: setsData.map((set) => {
			return {
				userId: set.user_id,
				timestamp: set.timestamp,
				objectType: set.object_type,
				objectId: set.object_id,
				setType: set.set_type,
				weight: set.weight,
				weightUnit: set.weight_unit,
				reps: set.reps,
				notes: set.notes,
				exerciseJoinId: set.exercise_join_id
			};
		})
	};
	return new Response(JSON.stringify(formattedBody), {
		status: response.status,
		headers: response.headers
	});
};

export const PUT: RequestHandler = async ({ url, params, request, locals }) => {
	const { exercisejoinId } = params;
	console.log(`PUT /api/exercise-joins/${exercisejoinId}`);
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
	const response = await fetch(`${env.HARD_API}/exercise-joins/${exercisejoinId}`, {
		method: 'PUT',
		headers: { 'X-Profile-Id': profileId },
		body: JSON.stringify(formattedBody)
	});
	return response;
};

export const DELETE: RequestHandler = async ({ url, params, locals }) => {
	const { exercisejoinId } = params;
	console.log(`DELETE /api/exercise-joins/${exercisejoinId}`);
	const profileId = locals.profileId;
	if (!profileId) {
		console.log('No profile selected');
		return new Response('Unauthorized', { status: 401 });
	}
	const response = await fetch(`${env.HARD_API}/exercise-joins/${exercisejoinId}`, {
		method: 'DELETE',
		headers: { 'X-Profile-Id': profileId }
	});
	return response;
};
