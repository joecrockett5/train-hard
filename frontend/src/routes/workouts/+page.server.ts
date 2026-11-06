import type { PageServerLoad } from './$types';

/**
 * Every workout, and the templates to start one from.
 *
 * The old page fetched a day at a time, in the browser, on every change of
 * the selected date -- so moving through a week was seven round trips and
 * swiping was visibly laggy. A profile's whole workout list is a few hundred
 * small rows, so it comes down once: the day filter and the calendar's
 * has-something-on-it dots are then both free.
 *
 * Templates do not change with the date, so they are read here too.
 */
export const load = (async ({ fetch }) => {
	async function list<T>(path: string, fallback: T): Promise<T> {
		try {
			const response = await fetch(path);
			return response.ok ? await response.json() : fallback;
		} catch {
			return fallback;
		}
	}

	const [workouts, templates] = await Promise.all([
		list('/api/workouts', []),
		list('/api/templates', [])
	]);

	return { workouts, templates };
}) satisfies PageServerLoad;
