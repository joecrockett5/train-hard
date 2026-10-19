/**
 * Geometry for the body weight graph.
 *
 * The app carries no charting library and its only other graphics are hand
 * written SVG, so the chart is drawn the same way. Keeping the arithmetic
 * here rather than in the component means the scaling and the axis rounding
 * can be tested without rendering anything.
 *
 * Weights are stored in kilograms; the chart plots whatever unit the profile
 * is showing, which the caller converts before handing them over.
 */

import type { BodyWeight } from '$lib/types';

/**
 * The drawing surface, in viewBox units. The component scales it to the
 * available width, so these are proportions rather than pixels.
 */
export const CHART_WIDTH = 640;
export const CHART_HEIGHT = 260;
export const PADDING = { top: 12, right: 16, bottom: 28, left: 46 };

const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/** How many labelled gridlines the value axis gets, give or take rounding. */
const Y_TICK_TARGET = 4;
/** How many dates the time axis labels. Every one is a real entry's date. */
const X_TICK_TARGET = 4;

export type ChartPoint = {
	x: number;
	y: number;
	weight: number;
	entry: BodyWeight;
};

export type Chart = {
	points: ChartPoint[];
	/** The polyline through every point, as an SVG `d` attribute. */
	path: string;
	/** The same path closed along the bottom of the plot, for the fill. */
	area: string;
	yTicks: { value: number; y: number }[];
	xTicks: { label: string; x: number }[];
	plot: { left: number; right: number; top: number; bottom: number };
};

/**
 * Orders entries oldest first, by the day being logged rather than by when
 * the row was written -- a weigh-in can be entered days later.
 */
export function sortEntries(entries: BodyWeight[]): BodyWeight[] {
	return entries
		.slice()
		.sort(
			(a, b) =>
				a.entryDate.localeCompare(b.entryDate) ||
				(a.timestamp ?? '').localeCompare(b.timestamp ?? '')
		);
}

/** A round step close to `rough`: one of 1, 2 or 5 times a power of ten. */
function niceStep(rough: number): number {
	if (!(rough > 0)) {
		return 1;
	}

	const magnitude = 10 ** Math.floor(Math.log10(rough));
	const normalised = rough / magnitude;
	const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;

	return step * magnitude;
}

function dayNumber(isoDate: string): number {
	return Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000;
}

/** `2026-10-17` as `17 Oct`, which is all the axis has room for. */
export function shortDate(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});
}

/**
 * Lays the entries out on the plot. Returns null for an empty list, which is
 * the caller's cue to show the empty state instead of an axis with nothing
 * on it.
 */
export function buildChart(entries: BodyWeight[]): Chart | null {
	const ordered = sortEntries(entries);

	if (ordered.length === 0) {
		return null;
	}

	const weights = ordered.map((entry) => entry.weight);
	const lowest = Math.min(...weights);
	const highest = Math.max(...weights);

	// A flat series has no range to scale against, so give it one and let the
	// line sit in the middle of the plot rather than on its floor. One kilo is
	// tight enough to show a half-kilo move and wide enough not to invent one.
	const span = Math.max(highest - lowest, 1);
	const step = niceStep(span / Y_TICK_TARGET);
	const axisMin = Math.floor((lowest - span * 0.1) / step) * step;
	const axisMax = Math.ceil((highest + span * 0.1) / step) * step;

	const days = ordered.map((entry) => dayNumber(entry.entryDate));
	const firstDay = days[0];
	const lastDay = days[days.length - 1];
	const dayRange = lastDay - firstDay;

	const toX = (day: number) =>
		dayRange === 0
			? PADDING.left + PLOT_WIDTH / 2
			: PADDING.left + ((day - firstDay) / dayRange) * PLOT_WIDTH;

	const toY = (weight: number) =>
		PADDING.top + (1 - (weight - axisMin) / (axisMax - axisMin)) * PLOT_HEIGHT;

	const points: ChartPoint[] = ordered.map((entry, index) => ({
		x: toX(days[index]),
		y: toY(weights[index]),
		weight: weights[index],
		entry
	}));

	const path = points
		.map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
		.join(' ');
	const bottom = PADDING.top + PLOT_HEIGHT;
	const area =
		points.length > 1
			? `${path} L${round(points[points.length - 1].x)} ${bottom} L${round(points[0].x)} ${bottom} Z`
			: '';

	const yTicks = [];
	for (let value = axisMin; value <= axisMax + step / 2; value += step) {
		// Floating point addition drifts; round back onto the step.
		const tick = Math.round(value / step) * step;
		yTicks.push({ value: tick, y: toY(tick) });
	}

	return {
		points,
		path,
		area,
		yTicks,
		xTicks: pickXTicks(points),
		plot: {
			left: PADDING.left,
			right: PADDING.left + PLOT_WIDTH,
			top: PADDING.top,
			bottom
		}
	};
}

/**
 * Labels up to `X_TICK_TARGET` of the plotted entries, always including the
 * first and the last, and never the same date twice.
 */
function pickXTicks(points: ChartPoint[]): { label: string; x: number }[] {
	const count = Math.min(X_TICK_TARGET, points.length);
	const ticks: { label: string; x: number }[] = [];
	const seen = new Set<string>();

	for (let index = 0; index < count; index++) {
		const point = points[count === 1 ? 0 : Math.round((index / (count - 1)) * (points.length - 1))];

		if (seen.has(point.entry.entryDate)) {
			continue;
		}
		seen.add(point.entry.entryDate);
		ticks.push({ label: shortDate(point.entry.entryDate), x: point.x });
	}

	return ticks;
}

/** Trims the float noise that `toX`/`toY` leave in the path data. */
function round(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * The headline numbers above the graph: where the profile is now, and how
 * far that is from the first entry. Null when there is nothing to report.
 */
export function summarise(
	entries: BodyWeight[]
): { latest: BodyWeight; current: number; change: number | null } | null {
	const ordered = sortEntries(entries);

	if (ordered.length === 0) {
		return null;
	}

	const latest = ordered[ordered.length - 1];

	return {
		latest,
		current: latest.weight,
		change: ordered.length > 1 ? latest.weight - ordered[0].weight : null
	};
}
