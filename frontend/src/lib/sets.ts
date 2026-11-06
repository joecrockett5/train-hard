/**
 * Formatting for a workout's sets.
 */

import type { Set } from '$lib/types';
import { formatDuration, formatWeight, toDisplayWeight, type WeightUnit } from '$lib/units';

export type SetSummaryEntry = {
	/** `REPSxWEIGHT`, e.g. `5x82.5`, or `MINUTESm` for a timed exercise. */
	label: string;
	/** Warm-up sets are shown italicised, to separate them from the work. */
	warmup: boolean;
};

export type SetSummaryOptions = {
	/** A timed exercise's sets are durations, not reps at a weight. */
	timed?: boolean;
	/** The unit to show weights in. Storage is always kilograms. */
	unit?: WeightUnit;
};

/**
 * A minimised exercise's sets, in the order they were done.
 *
 * No unit suffix on a weight: on a phone the card has room for the numbers
 * or the units but not both, and the unit is the profile's, shown in the
 * menu. A duration carries `m`, because there is nothing else it could be
 * confused with and `4.5` alone would read as a weight.
 */
export function summariseSets(
	sets: Set[],
	{ timed = false, unit = 'kg' }: SetSummaryOptions = {}
): SetSummaryEntry[] {
	return sets.map((set) => ({
		label: timed
			? `${formatDuration(set.duration ?? 0)}m`
			: `${formatWeight(set.reps)}x${formatWeight(toDisplayWeight(set.weight, unit))}`,
		warmup: set.setType === 'warmup'
	}));
}

/** Better, worse, the same, or nothing to say. */
export type SetComparison = 1 | 0 | -1 | undefined;

/**
 * One set against the same position in the previous session.
 *
 * Heavier wins outright, because adding weight is the point even when the
 * reps drop with it. Failing that it is total work -- reps times weight, or
 * minutes for a timed exercise -- so an extra rep at the same weight counts.
 *
 * Undefined when there is nothing to compare against: a shorter previous
 * session, or a position past its end. The old UI dereferenced that case,
 * and separately compared the live session against the *oldest* session it
 * had fetched rather than the most recent, so a set could be marked down
 * against a session three weeks before the one actually preceding it.
 */
export function compareSet(
	current: Set,
	previous: Set | undefined,
	{ timed = false }: { timed?: boolean } = {}
): SetComparison {
	if (!previous) {
		return undefined;
	}

	const heavier = timed
		? (current.duration ?? 0) > (previous.duration ?? 0)
		: current.weight > previous.weight;

	if (heavier) {
		return 1;
	}

	const work = (set: Set) => (timed ? (set.duration ?? 0) : set.weight * set.reps);

	if (work(current) > work(previous)) {
		return 1;
	}

	if (work(current) < work(previous)) {
		return -1;
	}

	return 0;
}

/**
 * The previous sessions of an exercise, oldest first, split into warm-up and
 * working sets.
 *
 * Dated by the workout rather than by when the row was written: a session
 * typed in on Sunday still happened on Tuesday, and labelling by the row made
 * a week of back-filled workouts all read as today.
 */
export type PastSession = {
	/** The workout it was part of, which is what keys the list. */
	workoutId: string;
	/** The day that session happened, `YYYY-MM-DD`. */
	workoutDate: string;
	title: string;
	warmup: Set[];
	working: Set[];
};

type RawSession = { workoutId: string; workoutDate: string; title: string; sets: Set[] };

export function pastSessions(sessions: RawSession[] | undefined): PastSession[] {
	if (!sessions) {
		return [];
	}

	return sessions
		.map((session) => ({
			workoutId: session.workoutId,
			workoutDate: session.workoutDate,
			title: session.title,
			warmup: session.sets.filter((set) => set.setType === 'warmup'),
			working: session.sets.filter((set) => set.setType !== 'warmup')
		}))
		.sort((a, b) => a.workoutDate.localeCompare(b.workoutDate));
}

/**
 * What to put in a new set's weight field.
 *
 * The set you are about to do is almost always at the weight of the last one
 * you did, so the field starts there rather than empty: in a gym that is the
 * difference between one tap and typing 82.5 between every set.
 *
 * This session first, then the most recent previous one -- its heaviest
 * working set, since a session's sets are usually a warm-up ramp and the top
 * set is what gets repeated.
 */
export function suggestedWeight(
	thisSession: Set[],
	previous: PastSession[],
	type: 'warmup' | 'working'
): number | undefined {
	const last = thisSession.at(-1);

	if (last) {
		return last.weight;
	}

	const mostRecent = previous.at(-1);

	if (!mostRecent) {
		return undefined;
	}

	if (type === 'warmup') {
		return mostRecent.warmup[0]?.weight;
	}

	return mostRecent.working.length > 0
		? Math.max(...mostRecent.working.map((set) => set.weight))
		: undefined;
}
