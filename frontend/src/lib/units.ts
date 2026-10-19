/**
 * Weights, and the unit they are shown in.
 *
 * Every weight in the database is kilograms. The profile's `weightUnit` only
 * decides how they are displayed and how a typed number is read back, so
 * switching between units never rewrites a row and never loses precision in
 * the round trip.
 */

import { writable } from 'svelte/store';

export type WeightUnit = 'kg' | 'lbs';

/** The definition of the pound, so the conversion is exact in one direction. */
export const KG_PER_LB = 0.45359237;

/**
 * The unit the app is currently showing weights in.
 *
 * A store rather than a prop: the preference belongs to the profile and is
 * read several components deep -- a set inside an exercise inside a workout
 * -- and threading it through every layer would be noise. The layout sets it
 * from the profile, the same way it applies the theme.
 */
export const weightUnit = writable<WeightUnit>('kg');

/** Kilograms as stored, in the unit being shown. */
export function toDisplayWeight(kilograms: number, unit: WeightUnit): number {
	return unit === 'kg' ? kilograms : kilograms / KG_PER_LB;
}

/** A number typed in the shown unit, as kilograms for storage. */
export function toStoredWeight(value: number, unit: WeightUnit): number {
	return unit === 'kg' ? value : value * KG_PER_LB;
}

/**
 * Up to two decimal places, with trailing zeros dropped.
 *
 * Two because one rounded away real precision -- 80.25kg became 80.3 -- and
 * because a converted weight rarely lands on a tenth. Dropping the zeros
 * keeps 80 as "80" rather than "80.00", which matters most on the graph's
 * axis where every tick would otherwise carry two dead digits.
 */
export function formatWeight(value: number): string {
	return (Math.round(value * 100) / 100).toString();
}

/** A weight as it should be read: converted, formatted, with its unit. */
export function displayWeight(kilograms: number, unit: WeightUnit): string {
	return `${formatWeight(toDisplayWeight(kilograms, unit))}${unit}`;
}

/** Minutes to one decimal place, with trailing zeros dropped. */
export function formatDuration(minutes: number): string {
	return (Math.round(minutes * 10) / 10).toString();
}
