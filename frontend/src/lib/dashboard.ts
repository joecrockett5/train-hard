/**
 * What the dashboard shows, worked out from what the API already returns.
 *
 * No new backend endpoint: a workout list, an exercise list and the joins
 * between exercises and workouts are enough for everything here, and a
 * personal log is a few hundred rows rather than a few hundred thousand.
 *
 * Pure functions, so the arithmetic -- which week a workout falls in, which
 * exercise has been logged most, what counts as "recent" -- can be tested
 * without a server.
 */

import type { Exercise, WorkoutInfo } from '$lib/types';
import type { ExerciseJoin } from '$lib/mapping';
import { daysBetween } from '$lib/dates';

/** How many days back "this week" reaches. */
export const WEEK = 7;

/**
 * Newest first, by the day being logged rather than by when the row was
 * written -- a workout can be entered days later and still belongs on its own
 * day.
 */
export function newestFirst(workouts: WorkoutInfo[]): WorkoutInfo[] {
	return workouts
		.slice()
		.sort(
			(a, b) =>
				b.workoutDate.localeCompare(a.workoutDate) ||
				(b.timestamp ?? '').localeCompare(a.timestamp ?? '')
		);
}

export type WorkoutSummary = {
	/** Everything logged on `today`, in the order they were started. */
	today: WorkoutInfo[];
	/** The most recent few, today's included. */
	recent: WorkoutInfo[];
	/** How many fall in the last `WEEK` days, today included. */
	thisWeek: number;
};

export function summariseWorkouts(
	workouts: WorkoutInfo[],
	today: string,
	recentCount = 4
): WorkoutSummary {
	const ordered = newestFirst(workouts);

	return {
		today: ordered.filter((workout) => workout.workoutDate === today).reverse(),
		recent: ordered.slice(0, recentCount),
		thisWeek: ordered.filter((workout) => {
			const age = daysBetween(workout.workoutDate, today);
			// Not future-dated, and inside the window.
			return age >= 0 && age < WEEK;
		}).length
	};
}

export type FrequentExercise = {
	exercise: Exercise;
	/** How many workouts it has appeared in. */
	sessions: number;
	/** The timestamp of the most recent of those, or undefined. */
	lastDone?: string;
};

/**
 * The exercises logged most often, most first.
 *
 * Counted from the exercise-joins, which is one row per time an exercise was
 * put in a workout -- so this is sessions, not sets. Ties break on the most
 * recent, so two exercises done five times each put the one done last week
 * above the one done in March.
 */
export function frequentExercises(
	exercises: Exercise[],
	joins: ExerciseJoin[],
	limit = 4
): FrequentExercise[] {
	const counts = new Map<string, { sessions: number; lastDone?: string }>();

	for (const join of joins) {
		const seen = counts.get(join.exerciseId) ?? { sessions: 0 };

		seen.sessions += 1;
		if (!seen.lastDone || join.timestamp > seen.lastDone) {
			seen.lastDone = join.timestamp;
		}

		counts.set(join.exerciseId, seen);
	}

	return exercises
		.map((exercise) => ({
			exercise,
			...(counts.get(exercise.objectId ?? '') ?? { sessions: 0, lastDone: undefined })
		}))
		.filter((entry) => entry.sessions > 0)
		.sort((a, b) => b.sessions - a.sessions || (b.lastDone ?? '').localeCompare(a.lastDone ?? ''))
		.slice(0, limit);
}

/**
 * Whether this profile has anything in it at all.
 *
 * Decides between a dashboard with empty sections on it -- which looks
 * broken -- and one card saying where to start.
 */
export function isFirstRun(counts: {
	workouts: number;
	exercises: number;
	weighIns: number;
}): boolean {
	return counts.workouts === 0 && counts.exercises === 0 && counts.weighIns === 0;
}
