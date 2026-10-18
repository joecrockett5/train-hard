/**
 * Formatting for a workout's sets.
 */

import type { Set } from '$lib/types';

export type SetSummaryEntry = {
	/** `REPSxWEIGHT`, e.g. `5x82.5`. */
	label: string;
	/** Warm-up sets are shown italicised, to separate them from the work. */
	warmup: boolean;
};

/** Up to one decimal place, with no trailing `.0`. */
function trim(value: number): string {
	return (Math.round(value * 10) / 10).toString();
}

/**
 * A minimised exercise's sets, in the order they were done.
 *
 * No unit: every set is kilograms, and on a phone the card has room for the
 * numbers or the units but not both.
 */
export function summariseSets(sets: Set[]): SetSummaryEntry[] {
	return sets.map((set) => ({
		label: `${trim(set.reps)}x${trim(set.weight)}`,
		warmup: set.setType === 'warmup'
	}));
}
