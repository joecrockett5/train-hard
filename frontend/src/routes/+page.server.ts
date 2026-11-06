import type { PageServerLoad } from './$types';

/**
 * Everything the dashboard shows, in one load.
 *
 * Each piece degrades to an empty list rather than taking the page down with
 * it. This is the landing screen, and a backend that is still starting should
 * not make the app look broken.
 *
 * The weigh-ins are the exception: they get a flag of their own, because the
 * chart's empty state reads "no weigh-ins yet", which would be a lie if the
 * truth is that we could not ask.
 */
async function list<T>(fetcher: typeof fetch, path: string, fallback: T): Promise<T> {
	try {
		const response = await fetcher(path);
		return response.ok ? await response.json() : fallback;
	} catch {
		return fallback;
	}
}

export const load = (async ({ fetch }) => {
	const [workouts, templates, exercises, joins] = await Promise.all([
		list(fetch, '/api/workouts', []),
		list(fetch, '/api/templates', []),
		list(fetch, '/api/exercises', []),
		list(fetch, '/api/exercise-joins', [])
	]);

	let bodyWeights = [];
	let weightsUnavailable = false;

	try {
		const response = await fetch('/api/body-weights');

		if (response.ok) {
			bodyWeights = await response.json();
		} else {
			weightsUnavailable = true;
		}
	} catch {
		weightsUnavailable = true;
	}

	return { workouts, templates, exercises, joins, bodyWeights, weightsUnavailable };
}) satisfies PageServerLoad;
