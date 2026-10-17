import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { toExerciseWithSets, toWorkoutInfo } from '$lib/mapping';

/**
 * The whole workout page in one request.
 *
 * Replaces a fan-out that fetched the workout, its exercises, every exercise,
 * and then one request per exercise for its sets -- each of which became one
 * or two further backend calls.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { workoutId } = params;
	const profileId = locals.profileId;

	if (!profileId) {
		return new Response('Unauthorized', { status: 401 });
	}

	const response = await fetch(`${env.HARD_API}/workouts/${workoutId}/detail`, {
		headers: { 'X-Profile-Id': profileId }
	});

	if (!response.ok) {
		return new Response(await response.text(), { status: response.status });
	}

	const raw = await response.json();

	return new Response(
		JSON.stringify({
			workoutInfo: toWorkoutInfo(raw.workout),
			exercises: raw.exercises.map(toExerciseWithSets),
			allExercises: raw.all_exercises.map(toExerciseWithSets)
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};
