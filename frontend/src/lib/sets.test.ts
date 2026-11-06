import { describe, expect, it } from 'vitest';
import { compareSet, pastSessions, suggestedWeight, summariseSets } from './sets';
import { KG_PER_LB } from './units';
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

describe('compareSet', () => {
	function working(reps: number, weight: number, duration = 0): Set {
		return {
			objectId: `${reps}-${weight}-${duration}`,
			setType: 'working',
			weight,
			weightUnit: 'kg',
			reps,
			duration,
			notes: '',
			exerciseJoinId: 'join-1'
		};
	}

	it('has nothing to say without a set to compare against', () => {
		// A shorter previous session, or a position past its end. The old UI
		// dereferenced this case.
		expect(compareSet(working(5, 80), undefined)).toBeUndefined();
	});

	it('counts heavier as better even when the reps drop', () => {
		// Adding weight is the point; 3x85 beats 5x80 despite less total work.
		expect(compareSet(working(3, 85), working(5, 80))).toBe(1);
	});

	it('counts an extra rep at the same weight as better', () => {
		expect(compareSet(working(6, 80), working(5, 80))).toBe(1);
	});

	it('counts less total work at the same weight as worse', () => {
		expect(compareSet(working(4, 80), working(5, 80))).toBe(-1);
	});

	it('counts an identical set as the same', () => {
		expect(compareSet(working(5, 80), working(5, 80))).toBe(0);
	});

	it('compares durations for a timed exercise, and ignores the weight', () => {
		expect(compareSet(working(0, 0, 6), working(0, 0, 5), { timed: true })).toBe(1);
		expect(compareSet(working(0, 0, 4), working(0, 0, 5), { timed: true })).toBe(-1);
		expect(compareSet(working(0, 0, 5), working(0, 0, 5), { timed: true })).toBe(0);
	});
});

describe('pastSessions', () => {
	const session = (workoutId: string, workoutDate: string, sets: Set[]) => ({
		workoutId,
		workoutDate,
		title: workoutId,
		sets
	});

	const warmup: Set = {
		objectId: 'w',
		setType: 'warmup',
		weight: 40,
		weightUnit: 'kg',
		reps: 10,
		duration: 0,
		notes: '',
		exerciseJoinId: 'j'
	};
	const work: Set = { ...warmup, objectId: 'k', setType: 'working', weight: 80, reps: 5 };

	it('is empty when nothing was fetched', () => {
		expect(pastSessions(undefined)).toEqual([]);
	});

	it('splits warm-up from working sets', () => {
		const [only] = pastSessions([session('w1', '2026-02-01', [warmup, work])]);

		expect(only.warmup.map((set) => set.objectId)).toEqual(['w']);
		expect(only.working.map((set) => set.objectId)).toEqual(['k']);
	});

	it('orders oldest first, which is the order the comparison walks', () => {
		const ordered = pastSessions([
			session('newer', '2026-02-20', [work]),
			session('older', '2026-02-01', [work])
		]);

		expect(ordered.map((each) => each.workoutId)).toEqual(['older', 'newer']);
	});
});

describe('suggestedWeight', () => {
	const set = (weight: number, setType: 'warmup' | 'working' = 'working'): Set => ({
		objectId: `${setType}-${weight}`,
		setType,
		weight,
		weightUnit: 'kg',
		reps: 5,
		duration: 0,
		notes: '',
		exerciseJoinId: 'j'
	});

	const previous = [
		{
			workoutId: 'w1',
			workoutDate: '2026-02-01',
			title: '',
			warmup: [set(40, 'warmup')],
			working: [set(80), set(85), set(82.5)]
		}
	];

	it('repeats the last set of this session', () => {
		expect(suggestedWeight([set(80), set(85)], previous, 'working')).toBe(85);
	});

	it('falls back to the heaviest working set of the last session', () => {
		// A session is usually a ramp, and the top set is what gets repeated.
		expect(suggestedWeight([], previous, 'working')).toBe(85);
	});

	it("falls back to the last session's first warm-up", () => {
		expect(suggestedWeight([], previous, 'warmup')).toBe(40);
	});

	it('has nothing to suggest the first time an exercise is logged', () => {
		expect(suggestedWeight([], [], 'working')).toBeUndefined();
	});

	it('has nothing to suggest when the last session had no sets of that kind', () => {
		const empty = [
			{ workoutId: 'w', workoutDate: '2026-02-01', title: '', warmup: [], working: [] }
		];

		expect(suggestedWeight([], empty, 'working')).toBeUndefined();
		expect(suggestedWeight([], empty, 'warmup')).toBeUndefined();
	});
});
