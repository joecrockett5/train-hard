import { describe, expect, it } from 'vitest';
import {
	displayWeight,
	formatDuration,
	formatWeight,
	KG_PER_LB,
	toDisplayWeight,
	toStoredWeight
} from './units';

describe('toDisplayWeight and toStoredWeight', () => {
	it('leaves kilograms alone', () => {
		expect(toDisplayWeight(80.25, 'kg')).toBe(80.25);
		expect(toStoredWeight(80.25, 'kg')).toBe(80.25);
	});

	it('converts to pounds and back', () => {
		expect(toDisplayWeight(KG_PER_LB, 'lbs')).toBeCloseTo(1, 10);
		expect(toStoredWeight(1, 'lbs')).toBeCloseTo(KG_PER_LB, 10);
	});

	it('round trips without drift, which is why storage stays in kilograms', () => {
		// Toggling the unit back and forth must not walk a logged weight.
		const stored = 82.5;
		const shown = toDisplayWeight(stored, 'lbs');

		expect(toStoredWeight(shown, 'lbs')).toBeCloseTo(stored, 10);
	});
});

describe('formatWeight', () => {
	it('keeps two decimal places', () => {
		// One rounded 80.25 to 80.3, which is the bug this fixes.
		expect(formatWeight(80.25)).toBe('80.25');
	});

	it('rounds beyond two', () => {
		expect(formatWeight(176.3698)).toBe('176.37');
	});

	it('drops trailing zeros rather than showing 80.00', () => {
		expect(formatWeight(80)).toBe('80');
		expect(formatWeight(80.5)).toBe('80.5');
		expect(formatWeight(80.1)).toBe('80.1');
	});
});

describe('displayWeight', () => {
	it('converts, formats and labels in one go', () => {
		expect(displayWeight(80, 'kg')).toBe('80kg');
		expect(displayWeight(KG_PER_LB * 100, 'lbs')).toBe('100lbs');
	});
});

describe('formatDuration', () => {
	it('is minutes to one decimal place', () => {
		expect(formatDuration(5.5)).toBe('5.5');
		expect(formatDuration(5.47)).toBe('5.5');
	});

	it('drops a trailing zero', () => {
		expect(formatDuration(5)).toBe('5');
	});
});
