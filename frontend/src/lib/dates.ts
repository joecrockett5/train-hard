/**
 * Dates the app stores, which are always plain calendar days in the user's
 * own timezone -- the day a workout happened or a weigh-in was taken, not an
 * instant.
 */

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
