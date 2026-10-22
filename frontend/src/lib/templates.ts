import type { Exercise } from '$lib/types';

/**
 * Copying a template's exercises into a workout.
 *
 * Lives here because it happens in three places -- the two create-a-workout
 * dialogs and the picker inside an existing workout -- and only the first two
 * differ, in that they have to create the workout first.
 */

type Fetcher = typeof fetch;

/**
 * Adds every exercise in a template to a workout.
 *
 * Exercises already in the workout are skipped rather than joined twice,
 * which is what importing into a half-built workout would otherwise do.
 *
 * One failed join does not abandon the rest: a template is a convenience,
 * and getting eight of nine exercises in beats getting none. The ones that
 * landed come back, in template order, for the caller to show.
 */
export async function importTemplate(
	templateId: string,
	workoutId: string,
	alreadyPresent: Iterable<string> = [],
	fetcher: Fetcher = fetch
): Promise<Exercise[]> {
	const present = new Set(alreadyPresent);

	const response = await fetcher(`/api/templates/${templateId}/detail`);

	if (!response.ok) {
		throw new Error(`Could not read template ${templateId}: ${response.status}`);
	}

	const { exercises }: { exercises: Exercise[] } = await response.json();
	const added: Exercise[] = [];

	for (const exercise of exercises) {
		if (present.has(exercise.objectId ?? '')) {
			continue;
		}

		const join = await fetcher('/api/exercise-joins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ workoutId, exerciseId: exercise.objectId })
		});

		if (join.ok) {
			// Without the template's join id. The exercise is crossing from
			// one context to the other, and in a workout that field means the
			// exercise-join the sets hang off -- which this is not, and which
			// the workout page is about to key its list on.
			added.push({ ...exercise, joinId: undefined, sets: [] });
		} else {
			console.error(`Could not add '${exercise.name}' from the template`);
		}
	}

	return added;
}
