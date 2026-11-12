import { describe, expect, it } from 'vitest';
import { firstWarmupWeight, nextWorkingWeight, summariseSets } from './sets';
import { KG_PER_LB, toStoredWeight } from './units';
import type { Set } from './types';

function set(
	reps: number,
	weight: number,
	setType: 'working' | 'warmup' = 'working',
	duration = 0
): Set {
	return {
		objectId: `${setType}-${reps}-${weight}-${duration}`,
		setType,
		weight,
		weightUnit: 'kg',
		reps,
		duration,
		notes: '',
		exerciseJoinId: 'join-1'
	};
}

describe('summariseSets', () => {
	it('is empty for an exercise with no sets', () => {
		expect(summariseSets([])).toEqual([]);
	});

	it('formats as reps by weight', () => {
		expect(summariseSets([set(5, 80)])[0].label).toBe('5x80');
	});

	it('keeps a fractional weight', () => {
		expect(summariseSets([set(5, 82.5)])[0].label).toBe('5x82.5');
	});

	it('drops a trailing zero rather than showing 80.0', () => {
		expect(summariseSets([set(5, 80.0)])[0].label).toBe('5x80');
	});

	it('shows the weight in the unit asked for', () => {
		const summary = summariseSets([set(5, KG_PER_LB * 100)], { unit: 'lbs' });

		expect(summary[0].label).toBe('5x100');
	});

	it('marks warm-up sets, which are shown italicised', () => {
		const summary = summariseSets([set(10, 40, 'warmup'), set(5, 80)]);

		expect(summary.map((entry) => entry.warmup)).toEqual([true, false]);
	});

	it('keeps the order it is given, which is the order they were done', () => {
		const summary = summariseSets([set(10, 40, 'warmup'), set(5, 80), set(3, 85)]);

		expect(summary.map((entry) => entry.label)).toEqual(['10x40', '5x80', '3x85']);
	});

	describe('for a timed exercise', () => {
		it('shows minutes instead of reps and weight', () => {
			const summary = summariseSets([set(0, 0, 'working', 5.5)], { timed: true });

			expect(summary[0].label).toBe('5.5m');
		});

		it('rounds to one decimal place', () => {
			expect(summariseSets([set(0, 0, 'working', 4.47)], { timed: true })[0].label).toBe('4.5m');
		});

		it('still marks a warm-up interval', () => {
			const summary = summariseSets([set(0, 0, 'warmup', 3), set(0, 0, 'working', 5)], {
				timed: true
			});

			expect(summary.map((entry) => entry.label)).toEqual(['3m', '5m']);
			expect(summary.map((entry) => entry.warmup)).toEqual([true, false]);
		});

		it('ignores the unit, which does not apply to a duration', () => {
			const summary = summariseSets([set(0, 0, 'working', 5)], { timed: true, unit: 'lbs' });

			expect(summary[0].label).toBe('5m');
		});
	});
});

describe('nextWorkingWeight', () => {
	it('has nothing to offer with no history at all', () => {
		expect(nextWorkingWeight([], [], 'kg')).toBeUndefined();
	});

	it('is the heaviest of the last session, before anything is logged', () => {
		const lastSession = [set(5, 80), set(5, 90), set(4, 85)];

		expect(nextWorkingWeight([], lastSession, 'kg')).toBe(90);
	});

	it('is the last weight lifted once this session has started', () => {
		expect(nextWorkingWeight([set(5, 100)], [set(5, 90)], 'kg')).toBe(100);
	});

	it('follows an edit to the set it was taken from', () => {
		// Changing 170 to 185 used to leave the next set offering 170,
		// because the number was read once and then left alone. 185 also
		// does not survive the round trip untouched, so it checks the
		// rounding at the same time.
		const edited = set(14, toStoredWeight(185, 'lbs'));

		expect(nextWorkingWeight([edited], [], 'lbs')).toBe(185);
	});

	it('is in the unit on screen, not the kilograms it is stored in', () => {
		// 180lbs is 81.6466kg; offering 81.64 to someone lifting in pounds
		// is the bug this exists to stop.
		const lastSession = [set(14, toStoredWeight(180, 'lbs'))];

		expect(nextWorkingWeight([], lastSession, 'lbs')).toBe(180);
		expect(nextWorkingWeight([], lastSession, 'kg')).toBe(81.65);
	});

	it('picks the heaviest by weight, not by the order they were done', () => {
		expect(nextWorkingWeight([], [set(5, 90), set(5, 70)], 'kg')).toBe(90);
	});
});

describe('firstWarmupWeight', () => {
	it('has nothing to offer with no warm-up last time', () => {
		expect(firstWarmupWeight([], 'kg')).toBeUndefined();
	});

	it('is where the last warm-up started, not where it finished', () => {
		const lastSession = [set(10, 40, 'warmup'), set(8, 60, 'warmup')];

		expect(firstWarmupWeight(lastSession, 'kg')).toBe(40);
	});

	it('is in the unit on screen', () => {
		const lastSession = [set(10, toStoredWeight(95, 'lbs'), 'warmup')];

		expect(firstWarmupWeight(lastSession, 'lbs')).toBe(95);
	});
});
