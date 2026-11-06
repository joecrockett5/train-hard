/**
 * Dates and numbers, in whatever language the app is serving.
 *
 * These exist so that no component reaches for `toLocaleDateString('en-GB')`
 * itself. That hard-coded tag is half of why the Japanese UI had to be a
 * branch: the strings were extractable, the date formats were not.
 *
 * Every one of these takes a `YYYY-MM-DD` and reads it as UTC midnight. The
 * day is the thing being stored, and parsing it locally would shift it a day
 * for anybody behind UTC.
 */

import { localeTag, t } from './index';
import { parseIso, todayIso } from '$lib/dates';

function format(iso: string, options: Intl.DateTimeFormatOptions): string {
	return parseIso(iso).toLocaleDateString(localeTag(), { ...options, timeZone: 'UTC' });
}

/** `17 October 2026` -- a screen heading. */
export function longDate(iso: string): string {
	return format(iso, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** `Saturday, 17 October 2026` -- the selected day on the calendar. */
export function weekdayDate(iso: string): string {
	return format(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** `17 Oct 2026` -- a card subtitle where the year still matters. */
export function mediumDate(iso: string): string {
	return format(iso, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** `17 Oct` -- all the chart's axis has room for. */
export function shortDate(iso: string): string {
	return format(iso, { day: 'numeric', month: 'short' });
}

/** `17 Oct 26` -- a year of weigh-ins needs the year, in two digits. */
export function compactDate(iso: string): string {
	return format(iso, { day: 'numeric', month: 'short', year: '2-digit' });
}

/** `October 2026` -- the calendar's heading. */
export function monthYear(iso: string): string {
	return format(iso, { month: 'long', year: 'numeric' });
}

/** The day number alone, for a cell in the month grid. */
export function dayOfMonth(iso: string): string {
	return format(iso, { day: 'numeric' });
}

/**
 * `Today`, `Yesterday`, or the date -- for a list where most rows are recent.
 *
 * `Intl.RelativeTimeFormat` with `numeric: 'auto'` is what produces the words
 * rather than "1 day ago", and does so in whichever language is loaded.
 */
export function relativeDay(iso: string, today: string = todayIso()): string {
	const days = Math.round((parseIso(iso).getTime() - parseIso(today).getTime()) / 86_400_000);

	if (days > -2 && days < 1) {
		return new Intl.RelativeTimeFormat(localeTag(), { numeric: 'auto' }).format(days, 'day');
	}

	return days > -340 ? shortDate(iso) : mediumDate(iso);
}

/** An ISO timestamp as a day, for rows keyed by when they were written. */
export function timestampDay(timestamp: string): string {
	return mediumDate(new Date(timestamp).toISOString().slice(0, 10));
}

/** Narrow weekday initials for the calendar header, in catalogue order. */
export function weekdayInitials(): readonly string[] {
	return t.calendar.weekdaysNarrow;
}

export function weekdayNames(): readonly string[] {
	return t.calendar.weekdays;
}
