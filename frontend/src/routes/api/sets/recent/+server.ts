import { error, type RequestHandler } from '@sveltejs/kit';
import { backendJson, handle, query } from '$lib/server/backend';
import { toSet } from '$lib/mapping';
import { type RawExerciseJoin, type RawSet, type Set } from '$lib/types';

/** How many previous sessions of an exercise the history popover shows. */
const HISTORY_LENGTH = 3;

/**
 * The sets logged for an exercise in its previous sessions, keyed by when
 * that session happened. The most recent join is the session in progress, so
 * it is dropped.
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
			error(404, 'No other instances found');
		}

		const previous = joins
			.slice()
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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

		const instances: Record<string, Set[]> = {};
		for (const join of previous) {
			instances[join.timestamp] = (byJoin.get(join.object_id) ?? [])
				.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
				.map(toSet);
		}

		return instances;
	});
