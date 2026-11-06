import type { PageServerLoad } from './$types';

/**
 * The counts shown under About.
 *
 * Each falls back to zero rather than taking the screen down: settings is
 * where somebody goes when something is wrong, so it has to render when the
 * backend is unhappy.
 */
async function count(fetcher: typeof fetch, path: string): Promise<number> {
	try {
		const response = await fetcher(path);
		return response.ok ? ((await response.json()) as unknown[]).length : 0;
	} catch {
		return 0;
	}
}

export const load = (async ({ fetch }) => {
	const [workouts, exercises, weighIns] = await Promise.all([
		count(fetch, '/api/workouts'),
		count(fetch, '/api/exercises'),
		count(fetch, '/api/body-weights')
	]);

	return { counts: { workouts, exercises, weighIns } };
}) satisfies PageServerLoad;
