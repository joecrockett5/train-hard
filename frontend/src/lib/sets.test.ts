import { describe, expect, it } from 'vitest';
import { summariseSets } from './sets';
import type { Set } from './types';

function set(reps: number, weight: number, setType: 'working' | 'warmup' = 'working'): Set {
	return {
		objectId: `${setType}-${reps}-${weight}`,
		setType,
		weight,
		weightUnit: 'kg',
		reps,
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

	it('marks warm-up sets, which are shown italicised', () => {
		const summary = summariseSets([set(10, 40, 'warmup'), set(5, 80)]);

		expect(summary.map((entry) => entry.warmup)).toEqual([true, false]);
	});

	it('keeps the order it is given, which is the order they were done', () => {
		const summary = summariseSets([set(10, 40, 'warmup'), set(5, 80), set(3, 85)]);

		expect(summary.map((entry) => entry.label)).toEqual(['10x40', '5x80', '3x85']);
	});
});
