import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, addMonths, daysBetween, monthGrid, sameMonth, todayIso, weekday } from './dates';

afterEach(() => {
	vi.useRealTimers();
});

describe('todayIso', () => {
	it('formats as YYYY-MM-DD', () => {
		expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('is the local day, not the UTC one', () => {
		// 8pm in New York on the 17th is already the 18th in UTC. A workout
		// logged then belongs to the 17th, which is the day the user is
		// living in; `toISOString()` would have said the 18th.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-18T00:30:00Z'));

		const utcDay = new Date().toISOString().slice(0, 10);
		const localDay = new Date().toLocaleDateString('en-CA');

		expect(todayIso()).toBe(localDay);

		if (localDay !== utcDay) {
			expect(todayIso()).not.toBe(utcDay);
		}
	});
});

describe('addDays', () => {
	it('moves forward and back', () => {
		expect(addDays('2026-03-10', 1)).toBe('2026-03-11');
		expect(addDays('2026-03-10', -1)).toBe('2026-03-09');
	});

	it('crosses a month and a year', () => {
		expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
	});

	it('knows February in a leap year', () => {
		expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
		expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
	});

	it('does not lose a day to a daylight-saving change', () => {
		// The clocks go forward in the UK on 29 March 2026. Done in local
		// time, stepping across it returns the same day twice.
		const days = [];
		for (let day = '2026-03-27', i = 0; i < 5; i++, day = addDays(day, 1)) {
			days.push(day);
		}

		expect(days).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31']);
	});
});

describe('addMonths', () => {
	it('moves whole months', () => {
		expect(addMonths('2026-03-10', 1)).toBe('2026-04-10');
		expect(addMonths('2026-03-10', -1)).toBe('2026-02-10');
	});

	it('clamps to the end of a shorter month rather than overflowing it', () => {
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
		expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
	});

	it('crosses a year', () => {
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
	});
});

describe('daysBetween', () => {
	it('counts forward and back', () => {
		expect(daysBetween('2026-03-01', '2026-03-10')).toBe(9);
		expect(daysBetween('2026-03-10', '2026-03-01')).toBe(-9);
	});

	it('is zero for the same day', () => {
		expect(daysBetween('2026-03-10', '2026-03-10')).toBe(0);
	});

	it('is a whole number across a daylight-saving change', () => {
		expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
	});
});

describe('monthGrid', () => {
	it('is always six weeks, so the grid does not change height as it pages', () => {
		for (const month of ['2026-02-01', '2026-03-01', '2026-11-01']) {
			const grid = monthGrid(month);

			expect(grid).toHaveLength(6);
			expect(grid.every((week) => week.length === 7)).toBe(true);
		}
	});

	it('starts on the Sunday on or before the first of the month', () => {
		// 1 March 2026 is a Sunday, so that week needs no leading days.
		expect(monthGrid('2026-03-15')[0][0]).toBe('2026-03-01');
		// 1 November 2026 is also a Sunday; 1 April 2026 is a Wednesday.
		expect(monthGrid('2026-04-15')[0][0]).toBe('2026-03-29');
	});

	it('covers every day of the month', () => {
		const days = monthGrid('2026-02-10').flat();

		expect(days).toContain('2026-02-01');
		expect(days).toContain('2026-02-28');
	});

	it('runs without a gap', () => {
		const days = monthGrid('2026-04-15').flat();

		for (let index = 1; index < days.length; index++) {
			expect(daysBetween(days[index - 1], days[index])).toBe(1);
		}
	});
});

describe('sameMonth', () => {
	it('compares the month, not the day', () => {
		expect(sameMonth('2026-03-01', '2026-03-31')).toBe(true);
		expect(sameMonth('2026-03-31', '2026-04-01')).toBe(false);
		expect(sameMonth('2026-03-01', '2027-03-01')).toBe(false);
	});
});

describe('weekday', () => {
	it('is zero for Sunday, matching the first column of the grid', () => {
		expect(weekday('2026-03-01')).toBe(0);
		expect(weekday('2026-03-02')).toBe(1);
		expect(weekday('2026-03-07')).toBe(6);
	});
});
