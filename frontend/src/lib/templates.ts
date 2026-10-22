import type { Exercise, Tag, Template } from '$lib/types';

/**
 * Copying a template's exercises into a workout.
 *
 * Lives here because it happens in three places -- the two create-a-workout
 * dialogs and the picker inside an existing workout -- and only the first two
 * differ, in that they have to create the workout first.
 *
 * The other direction, making a template, is here too: both ends of the same
 * feature, and both of them a sequence of joins written one at a time.
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

/**
 * Creates a template, applies its tags, and fills it with exercises.
 *
 * Tags and exercises are joins, so they can only be written once the template
 * has an id -- which is why this is a sequence rather than one request, and
 * why the caller hands over a selection rather than a finished template.
 *
 * One failed join leaves the template made and that one thing off, the way
 * creating a tagged exercise already did: a template missing a tag is fixed
 * in the edit dialog, while losing the lot means doing it all again. What
 * landed comes back on the template, so the caller can show it.
 */
export async function createTemplateFrom(
	details: { name: string; notes: string; tags: Tag[] },
	exercises: Exercise[] = [],
	fetcher: Fetcher = fetch
): Promise<Template> {
	const response = await fetcher('/api/templates', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name: details.name.trim(), description: details.notes.trim() })
	});

	if (!response.ok) {
		throw new Error(`Could not create the template: ${response.status}`);
	}

	const created: Template = await response.json();

	const applied: Tag[] = [];
	for (const tag of details.tags) {
		const join = await fetcher('/api/tag-joins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ targetId: created.objectId, tagId: tag.objectId })
		});

		if (join.ok) {
			applied.push(tag);
		} else {
			console.error(`Failed to tag '${created.name}' with '${tag.name}'`);
		}
	}

	let added = 0;
	for (const exercise of exercises) {
		const join = await fetcher('/api/template-joins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ templateId: created.objectId, exerciseId: exercise.objectId })
		});

		if (join.ok) {
			added += 1;
		} else {
			console.error(`Failed to add '${exercise.name}' to '${created.name}'`);
		}
	}

	return { ...created, tags: applied, exerciseCount: added };
}
