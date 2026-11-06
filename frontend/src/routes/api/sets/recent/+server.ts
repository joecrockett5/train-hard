import { error, type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { toSet, type RawWorkout } from '$lib/mapping';
import { type RawExerciseJoin, type RawSet, type Set } from '$lib/types';

/** How many previous sessions of an exercise the history shows. */
const HISTORY_LENGTH = 3;

export type PastSessionPayload = {
	workoutId: string;
	/** The day it happened, `YYYY-MM-DD`. */
	workoutDate: string;
	title: string;
	sets: Set[];
};

/**
 * The sets logged for an exercise in its previous sessions, oldest first.
 *
 * The most recent join is the session in progress, so it is dropped.
 *
 * Each session is labelled with its *workout's* date rather than the join
 * row's timestamp. Those are different things -- a workout can be typed in
 * days after it happened -- and labelling by the row made a week of
 * back-filled sessions all read as today.
 */
export const GET: RequestHandler = ({ url, locals }) =>
	handle(locals, async (profileId) => {
		const exercise = url.searchParams.get('exercise');

		if (!exercise) {
			error(400, 'exercise is required');
		}

		const joins = await backendJson<RawExerciseJoin[]>(
			profileId,
			`/exercise-joins${query({ exercise })}`
		);

		if (joins.length < 2) {
			return { sessions: [] };
		}

		const previous = joins
			.slice()
			.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
			.slice(1, 1 + HISTORY_LENGTH);

		const raw = await backendJson<RawSet[]>(profileId, `/sets${query({ exercise })}`);

		const byJoin = new Map<string, RawSet[]>();
		for (const set of raw) {
			const bucket = byJoin.get(set.exercise_join_id);
			if (bucket) {
				bucket.push(set);
			} else {
				byJoin.set(set.exercise_join_id, [set]);
			}
		}

		// At most three, so the fan-out is bounded and worth the right label.
		const workouts = await Promise.all(
			previous.map((join) =>
				backendJson<RawWorkout>(profileId, `/workouts/${join.workout_id}`).catch(() => null)
			)
		);

		const sessions: PastSessionPayload[] = previous.map((join, index) => ({
			workoutId: join.workout_id,
			workoutDate: workouts[index]?.workout_date ?? join.timestamp.slice(0, 10),
			title: workouts[index]?.title ?? '',
			sets: (byJoin.get(join.object_id) ?? [])
				.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
				.map(toSet)
		}));

		// Oldest first, which is the order the comparison walks.
		sessions.reverse();

		return { sessions };
	});
