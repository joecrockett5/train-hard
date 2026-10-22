import { describe, expect, it, vi } from 'vitest';
import { createTemplateFrom, importTemplate } from './templates';
import type { Exercise, Tag } from '$lib/types';

function exercise(objectId: string, name: string): Partial<Exercise> {
	return { objectId, name };
}

/** A fetch that serves one template's detail and records the joins written. */
function stubFetch(exercises: Partial<Exercise>[], { failOn = '' } = {}) {
	const joined: string[] = [];

	const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);

		if (url.startsWith('/api/templates/')) {
			return new Response(JSON.stringify({ exercises }), { status: 200 });
		}

		const body = JSON.parse(String(init?.body));

		if (body.exerciseId === failOn) {
			return new Response('no', { status: 500 });
		}

		joined.push(body.exerciseId);
		return new Response('{}', { status: 201 });
	});

	return { fetcher: fetcher as unknown as typeof fetch, joined };
}

describe('importTemplate', () => {
	it('joins every exercise in the template to the workout', async () => {
		const { fetcher, joined } = stubFetch([exercise('a', 'Squat'), exercise('b', 'Leg press')]);

		const added = await importTemplate('t1', 'w1', [], fetcher);

		expect(joined).toEqual(['a', 'b']);
		expect(added.map((e) => e.name)).toEqual(['Squat', 'Leg press']);
	});

	it("drops the template's join id, which means something else in a workout", async () => {
		// The workout page keys its list on joinId and reads it as the join
		// the sets hang off. Carried across, it pointed at a template join.
		const { fetcher } = stubFetch([{ ...exercise('a', 'Squat'), joinId: 'template-join-1' }]);

		const [added] = await importTemplate('t1', 'w1', [], fetcher);

		expect(added.joinId).toBeUndefined();
		expect(added.sets).toEqual([]);
	});

	it('skips the ones the workout already has', async () => {
		// Importing into a workout part-way through would otherwise list an
		// exercise twice, and the page keys on the join, so both would show.
		const { fetcher, joined } = stubFetch([exercise('a', 'Squat'), exercise('b', 'Leg press')]);

		const added = await importTemplate('t1', 'w1', ['a'], fetcher);

		expect(joined).toEqual(['b']);
		expect(added.map((e) => e.name)).toEqual(['Leg press']);
	});

	it('keeps going when one join fails, and reports only what landed', async () => {
		const { fetcher, joined } = stubFetch(
			[exercise('a', 'Squat'), exercise('b', 'Leg press'), exercise('c', 'Calf raise')],
			{ failOn: 'b' }
		);

		const added = await importTemplate('t1', 'w1', [], fetcher);

		expect(joined).toEqual(['a', 'c']);
		expect(added.map((e) => e.name)).toEqual(['Squat', 'Calf raise']);
	});

	it('throws when the template cannot be read, rather than silently adding nothing', async () => {
		const fetcher = vi.fn(async () => new Response('gone', { status: 404 }));

		await expect(
			importTemplate('t1', 'w1', [], fetcher as unknown as typeof fetch)
		).rejects.toThrow(/404/);
	});
});

/** A fetch that creates a template and records the joins written against it. */
function stubCreate({ failTag = '', failExercise = '', createStatus = 201 } = {}) {
	const tagged: string[] = [];
	const joined: string[] = [];

	const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		const body = init?.body ? JSON.parse(String(init.body)) : {};

		if (url === '/api/templates') {
			return new Response(JSON.stringify({ objectId: 't1', name: body.name }), {
				status: createStatus
			});
		}

		if (url === '/api/tag-joins') {
			if (body.tagId === failTag) {
				return new Response('no', { status: 500 });
			}
			tagged.push(body.tagId);
			return new Response('{}', { status: 201 });
		}

		if (body.exerciseId === failExercise) {
			return new Response('no', { status: 500 });
		}
		joined.push(body.exerciseId);
		return new Response('{}', { status: 201 });
	});

	return { fetcher: fetcher as unknown as typeof fetch, tagged, joined };
}

function tag(objectId: string, name: string): Tag {
	return { objectId, name } as Tag;
}

describe('createTemplateFrom', () => {
	it('creates the template, applies its tags and adds every exercise', async () => {
		const { fetcher, tagged, joined } = stubCreate();

		const template = await createTemplateFrom(
			{ name: 'Leg day', notes: 'Heavy', tags: [tag('x', 'Legs')] },
			[exercise('a', 'Squat'), exercise('b', 'Leg press')] as Exercise[],
			fetcher
		);

		expect(tagged).toEqual(['x']);
		expect(joined).toEqual(['a', 'b']);
		expect(template.tags).toHaveLength(1);
		expect(template.exerciseCount).toBe(2);
	});

	it('is happy with no exercises, which is how a template is made from scratch', async () => {
		const { fetcher, joined } = stubCreate();

		const template = await createTemplateFrom({ name: 'Empty', notes: '', tags: [] }, [], fetcher);

		expect(joined).toEqual([]);
		expect(template.exerciseCount).toBe(0);
	});

	it('keeps the template when one tag fails, rather than losing the lot', async () => {
		// A template missing a tag is two taps to fix in the edit dialog;
		// doing the whole thing again is not.
		const { fetcher, joined } = stubCreate({ failTag: 'y' });

		const template = await createTemplateFrom(
			{ name: 'Leg day', notes: '', tags: [tag('x', 'Legs'), tag('y', 'Push')] },
			[exercise('a', 'Squat')] as Exercise[],
			fetcher
		);

		expect(template.tags?.map((each) => each.objectId)).toEqual(['x']);
		expect(joined).toEqual(['a']);
	});

	it('keeps going when one exercise fails, and counts only what landed', async () => {
		const { fetcher, joined } = stubCreate({ failExercise: 'b' });

		const template = await createTemplateFrom(
			{ name: 'Leg day', notes: '', tags: [] },
			[
				exercise('a', 'Squat'),
				exercise('b', 'Leg press'),
				exercise('c', 'Calf raise')
			] as Exercise[],
			fetcher
		);

		expect(joined).toEqual(['a', 'c']);
		expect(template.exerciseCount).toBe(2);
	});

	it('throws when the template itself cannot be made, so nothing is half-reported', async () => {
		const { fetcher } = stubCreate({ createStatus: 500 });

		await expect(
			createTemplateFrom({ name: 'Leg day', notes: '', tags: [] }, [], fetcher)
		).rejects.toThrow(/500/);
	});
});
