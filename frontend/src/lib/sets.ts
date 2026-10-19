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
