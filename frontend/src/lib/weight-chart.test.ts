import { describe, expect, it } from 'vitest';
import {
	buildChart,
	CHART_HEIGHT,
	CHART_WIDTH,
	PADDING,
	shortDate,
	sortEntries,
	summarise
} from './weight-chart';
import type { BodyWeight } from './types';

function entry(entryDate: string, weight: number): BodyWeight {
	return {
		userId: 'profile-1',
		timestamp: `${entryDate}T10:00:00`,
		objectId: `weight-${entryDate}-${weight}`,
		objectType: 'BodyWeight',
		entryDate,
		weight,
		notes: ''
	};
}

const plotLeft = PADDING.left;
const plotRight = CHART_WIDTH - PADDING.right;
const plotTop = PADDING.top;
const plotBottom = CHART_HEIGHT - PADDING.bottom;
const PLOT_HEIGHT = plotBottom - plotTop;

describe('sortEntries', () => {
	it('orders by the logged date, not by when the row was written', () => {
		const late = { ...entry('2026-01-01', 80), timestamp: '2026-03-01T10:00:00' };
		const early = { ...entry('2026-02-01', 81), timestamp: '2026-02-01T10:00:00' };

		expect(sortEntries([late, early]).map((e) => e.entryDate)).toEqual([
			'2026-01-01',
			'2026-02-01'
		]);
	});

	it('does not mutate its argument', () => {
		const entries = [entry('2026-02-01', 81), entry('2026-01-01', 80)];
		sortEntries(entries);

		expect(entries[0].entryDate).toBe('2026-02-01');
	});
});

describe('buildChart', () => {
	it('returns null for no entries, so the page can show its empty state', () => {
		expect(buildChart([])).toBeNull();
	});

	it('spans the plot horizontally, oldest on the left', () => {
		const chart = buildChart([entry('2026-01-31', 79), entry('2026-01-01', 82)])!;

		expect(chart.points[0].entry.entryDate).toBe('2026-01-01');
		expect(chart.points[0].x).toBeCloseTo(plotLeft, 6);
		expect(chart.points[1].x).toBeCloseTo(plotRight, 6);
	});

	it('spaces points by elapsed days rather than by position', () => {
		// Two days apart, then twenty: the first gap must be the short one.
		const chart = buildChart([
			entry('2026-01-01', 80),
			entry('2026-01-03', 80.5),
			entry('2026-01-23', 81)
		])!;

		const firstGap = chart.points[1].x - chart.points[0].x;
		const secondGap = chart.points[2].x - chart.points[1].x;

		expect(secondGap).toBeCloseTo(firstGap * 10, 6);
	});

	it('puts a heavier weight higher up the plot', () => {
		const chart = buildChart([entry('2026-01-01', 80), entry('2026-01-02', 85)])!;

		expect(chart.points[1].y).toBeLessThan(chart.points[0].y);
	});

	it('keeps every point inside the plot area', () => {
		const chart = buildChart([
			entry('2026-01-01', 70),
			entry('2026-02-01', 95),
			entry('2026-03-01', 82)
		])!;

		for (const point of chart.points) {
			expect(point.y).toBeGreaterThanOrEqual(plotTop);
			expect(point.y).toBeLessThanOrEqual(plotBottom);
			expect(point.x).toBeGreaterThanOrEqual(plotLeft);
			expect(point.x).toBeLessThanOrEqual(plotRight);
		}
	});

	it('centres a lone entry rather than pinning it to an edge', () => {
		const chart = buildChart([entry('2026-01-01', 80)])!;

		expect(chart.points[0].x).toBeCloseTo((plotLeft + plotRight) / 2, 6);
		expect(chart.points[0].y).toBeGreaterThan(plotTop);
		expect(chart.points[0].y).toBeLessThan(plotBottom);
		// Nothing to fill between, so no area path.
		expect(chart.area).toBe('');
	});

	it('does not magnify a tiny change into a dramatic swing', () => {
		// Half a kilo across three months is a real but small move; the floor
		// on the value range keeps it from filling the whole plot.
		const chart = buildChart([entry('2026-01-01', 80), entry('2026-04-01', 80.05)])!;

		expect(Math.abs(chart.points[0].y - chart.points[1].y)).toBeLessThan(PLOT_HEIGHT / 4);
	});

	it('gives an unchanging weight a range to sit in', () => {
		const chart = buildChart([
			entry('2026-01-01', 80),
			entry('2026-02-01', 80),
			entry('2026-03-01', 80)
		])!;

		for (const point of chart.points) {
			expect(Number.isFinite(point.y)).toBe(true);
			expect(point.y).toBeGreaterThan(plotTop);
			expect(point.y).toBeLessThan(plotBottom);
		}
	});

	it('writes a move-then-line path with no NaNs', () => {
		const chart = buildChart([entry('2026-01-01', 80), entry('2026-01-02', 81)])!;

		expect(chart.path.startsWith('M')).toBe(true);
		expect(chart.path).toContain('L');
		expect(chart.path).not.toContain('NaN');
	});

	it('closes the area along the bottom of the plot', () => {
		const chart = buildChart([entry('2026-01-01', 80), entry('2026-01-02', 81)])!;

		expect(chart.area.endsWith('Z')).toBe(true);
		expect(chart.area).toContain(`${plotBottom}`);
	});

	it('rounds the value axis to readable steps that bracket the data', () => {
		const chart = buildChart([entry('2026-01-01', 78.4), entry('2026-02-01', 83.9)])!;
		const values = chart.yTicks.map((tick) => tick.value);

		expect(values.length).toBeGreaterThanOrEqual(2);
		expect(Math.min(...values)).toBeLessThanOrEqual(78.4);
		expect(Math.max(...values)).toBeGreaterThanOrEqual(83.9);

		const steps = values.slice(1).map((value, index) => value - values[index]);
		for (const step of steps) {
			expect(step).toBeCloseTo(steps[0], 6);
		}
	});

	it('labels real entry dates, first and last among them, without repeats', () => {
		const entries = [
			entry('2026-01-01', 80),
			entry('2026-01-08', 80.4),
			entry('2026-01-15', 79.8),
			entry('2026-01-22', 79.2),
			entry('2026-01-29', 79)
		];
		const chart = buildChart(entries)!;
		const labels = chart.xTicks.map((tick) => tick.label);

		expect(labels[0]).toBe(shortDate('2026-01-01'));
		expect(labels.at(-1)).toBe(shortDate('2026-01-29'));
		expect(new Set(labels).size).toBe(labels.length);
	});

	it('does not repeat a label when two entries share a date', () => {
		const chart = buildChart([entry('2026-01-01', 80), entry('2026-01-01', 80.4)])!;
		const labels = chart.xTicks.map((tick) => tick.label);

		expect(new Set(labels).size).toBe(labels.length);
	});
});

describe('shortDate', () => {
	it('reads the ISO date as a plain day, not as UTC midnight local time', () => {
		// Parsed naively as a Date, "2026-01-01" is UTC midnight, which is the
		// 31st of December west of Greenwich.
		expect(shortDate('2026-01-01')).toBe('1 Jan');
	});
});

describe('summarise', () => {
	it('is null with nothing logged', () => {
		expect(summarise([])).toBeNull();
	});

	it('reports the latest weight and the change from the first', () => {
		const summary = summarise([entry('2026-01-01', 84), entry('2026-03-01', 80.5)])!;

		expect(summary.current).toBe(80.5);
		expect(summary.change).toBeCloseTo(-3.5, 6);
	});

	it('has no change to report from a single entry', () => {
		expect(summarise([entry('2026-01-01', 80)])!.change).toBeNull();
	});
});
