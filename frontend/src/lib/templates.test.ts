import { describe, expect, it, vi } from 'vitest';
import { importTemplate } from './templates';
import type { Exercise } from '$lib/types';

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
