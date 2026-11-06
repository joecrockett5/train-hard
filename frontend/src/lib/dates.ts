/**
 * Plain calendar days.
 *
 * Everything the app stores a date for -- the day a workout happened, the day
 * a weigh-in was taken -- is a day in the user's own timezone, not an
 * instant. So dates are `YYYY-MM-DD` strings throughout, and the arithmetic
 * below is done in UTC so that a month with a daylight-saving change in it
 * does not gain or lose a day.
 */

const DAY_MS = 86_400_000;

/**
 * Today as `YYYY-MM-DD`, in local time.
 *
 * `toISOString().split('T')[0]` is the usual way to write this and is wrong
 * for exactly the people most likely to hit it: anywhere behind UTC, logging
 * an evening session, it returns tomorrow's date. `en-CA` formats as
 * ISO-8601 and, unlike `toISOString`, does so in local time.
 */
export function todayIso(): string {
	return new Date().toLocaleDateString('en-CA');
}

/** A `YYYY-MM-DD` string as the UTC instant of its midnight. */
export function parseIso(iso: string): Date {
	return new Date(`${iso}T00:00:00Z`);
}

/** The UTC instant back as `YYYY-MM-DD`. */
export function toIso(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
	return toIso(new Date(parseIso(iso).getTime() + days * DAY_MS));
}

/** Clamps to the end of the month, so 31 January plus a month is 28 February. */
export function addMonths(iso: string, months: number): string {
	const date = parseIso(iso);
	const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
	const lastDay = new Date(
		Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
	).getUTCDate();

	return toIso(
		new Date(
			Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate(), lastDay))
		)
	);
}

/** Whole days from `from` to `to`, negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
	return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / DAY_MS);
}

export function startOfMonth(iso: string): string {
	const date = parseIso(iso);
	return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

/** 0 for Sunday, matching the calendar grid's first column. */
export function weekday(iso: string): number {
	return parseIso(iso).getUTCDay();
}

export function sameMonth(a: string, b: string): boolean {
	return a.slice(0, 7) === b.slice(0, 7);
}

/**
 * Six weeks of days covering the month `iso` falls in, Sunday first.
 *
 * Always six rows, including for a 28-day February starting on a Sunday, so
 * the grid does not change height as the reader pages through months.
 */
export function monthGrid(iso: string): string[][] {
	const first = startOfMonth(iso);
	const start = addDays(first, -weekday(first));

	return Array.from({ length: 6 }, (_, week) =>
		Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day))
	);
}
