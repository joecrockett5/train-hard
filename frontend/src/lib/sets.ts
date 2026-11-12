/**
 * Formatting for a workout's sets.
 */

import type { Set } from '$lib/types';
import {
	editableWeight,
	formatDuration,
	formatWeight,
	toDisplayWeight,
	type WeightUnit
} from '$lib/units';

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

/**
 * The weight a new working set should start from, in the unit on screen.
 *
 * What this session has already done wins: the next set starts from the last
 * weight lifted, which is the number being reached for by someone already
 * under the bar. With nothing logged yet it is the heaviest working set of
 * the last session -- the mark to beat.
 *
 * Both lists hold kilograms, as everything stored does. The number returned
 * is in `unit`, because it goes straight into a box labelled with that unit;
 * handing back the kilograms put 81.64 in front of someone lifting 180lbs.
 */
export function nextWorkingWeight(
	loggedSoFar: Set[],
	lastSession: Set[],
	unit: WeightUnit
): number | undefined {
	const previous = loggedSoFar.at(-1);
	const kilograms = previous
		? previous.weight
		: lastSession.length > 0
			? Math.max(...lastSession.map((set) => set.weight))
			: undefined;

	return kilograms === undefined ? undefined : editableWeight(kilograms, unit);
}

/**
 * The weight a warm-up should start from, in the unit on screen.
 *
 * Where the last session started, not the heaviest it reached: a warm-up
 * climbs, so its first set is the one worth repeating.
 */
export function firstWarmupWeight(lastSession: Set[], unit: WeightUnit): number | undefined {
	const first = lastSession.at(0);

	return first === undefined ? undefined : editableWeight(first.weight, unit);
}
