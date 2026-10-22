import type { PageServerLoad } from './$types';

/**
 * The templates offered in the create-a-workout dialog.
 *
 * The workouts themselves are still fetched in the browser, because they
 * change with the date the calendar is on. Templates do not, so they are read
 * once here.
 *
 * A failure degrades to an empty list -- no templates to import from -- which
 * is the same thing the dialog shows a profile that has none, rather than a
 * 500 for a page whose job is the calendar.
 */
export const load = (async ({ fetch }) => {
	try {
		const response = await fetch('/api/templates');

		return { templates: response.ok ? await response.json() : [] };
	} catch {
		return { templates: [] };
	}
}) satisfies PageServerLoad;
