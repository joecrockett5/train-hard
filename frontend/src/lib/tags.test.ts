import { describe, expect, it } from 'vitest';
import { filterByTags, nextTagColour, sortTags, TAG_COLOURS, tagNameTaken } from './tags';
import type { Tag } from './types';

function tag(name: string, objectId = name.toLowerCase(), colorHex = '#e11d48'): Tag {
	return { objectId, name, colorHex };
}

describe('nextTagColour', () => {
	it('starts at the top of the palette', () => {
		expect(nextTagColour([])).toBe(TAG_COLOURS[0]);
	});

	it('skips colours already in use, so new tags look distinct', () => {
		const existing = [tag('Push', 'p', TAG_COLOURS[0]), tag('Pull', 'l', TAG_COLOURS[1])];

		expect(nextTagColour(existing)).toBe(TAG_COLOURS[2]);
	});

	it('ignores the case a colour was stored in', () => {
		const existing = [tag('Push', 'p', TAG_COLOURS[0].toUpperCase())];

		expect(nextTagColour(existing)).toBe(TAG_COLOURS[1]);
	});

	it('reuses a colour freed by a deleted tag rather than skipping past it', () => {
		const existing = TAG_COLOURS.filter((_, index) => index !== 3).map((colour, index) =>
			tag(`Tag ${index}`, `t${index}`, colour)
		);

		expect(nextTagColour(existing)).toBe(TAG_COLOURS[3]);
	});

	it('wraps rather than failing once the palette is exhausted', () => {
		const existing = TAG_COLOURS.map((colour, index) => tag(`Tag ${index}`, `t${index}`, colour));

		expect(TAG_COLOURS).toContain(nextTagColour(existing));
	});

	it('offers colours that are all distinct', () => {
		expect(new Set(TAG_COLOURS).size).toBe(TAG_COLOURS.length);
	});
});

describe('sortTags', () => {
	it('is alphabetical regardless of case', () => {
		const sorted = sortTags([tag('pull'), tag('Arms'), tag('Legs')]);

		expect(sorted.map((each) => each.name)).toEqual(['Arms', 'Legs', 'pull']);
	});

	it('does not mutate its argument', () => {
		const tags = [tag('Pull'), tag('Arms')];
		sortTags(tags);

		expect(tags[0].name).toBe('Pull');
	});
});

describe('tagNameTaken', () => {
	const tags = [tag('Push'), tag('Legs')];

	it('matches ignoring case and surrounding space', () => {
		expect(tagNameTaken(tags, '  push ')).toBe(true);
		expect(tagNameTaken(tags, 'PUSH')).toBe(true);
	});

	it('does not match a different name', () => {
		expect(tagNameTaken(tags, 'Pull')).toBe(false);
	});
});

describe('filterByTags', () => {
	const push = tag('Push', 'push-id');
	const pull = tag('Pull', 'pull-id');
	const legs = tag('Legs', 'legs-id');

	const exercises = [
		{ name: 'Bench', tags: [push] },
		{ name: 'Row', tags: [pull] },
		{ name: 'Squat', tags: [legs] },
		{ name: 'Clean', tags: [pull, legs] },
		{ name: 'Untagged', tags: [] }
	];

	it('selecting nothing filters nothing', () => {
		expect(filterByTags(exercises, [])).toHaveLength(exercises.length);
	});

	it('keeps only what carries the tag', () => {
		expect(filterByTags(exercises, ['push-id']).map((e) => e.name)).toEqual(['Bench']);
	});

	it('matches any of the selected tags, not all of them', () => {
		// Push and Pull are workout types: picking both means either day's
		// exercises, not exercises that are somehow both.
		expect(filterByTags(exercises, ['push-id', 'pull-id']).map((e) => e.name)).toEqual([
			'Bench',
			'Row',
			'Clean'
		]);
	});

	it('includes an item once even when it matches several selected tags', () => {
		expect(filterByTags(exercises, ['pull-id', 'legs-id']).map((e) => e.name)).toEqual([
			'Row',
			'Squat',
			'Clean'
		]);
	});

	it('excludes untagged items whenever anything is selected', () => {
		expect(filterByTags(exercises, ['push-id']).map((e) => e.name)).not.toContain('Untagged');
	});

	it('tolerates an item with no tags field at all', () => {
		// An exercise from an endpoint that does not join the tags in.
		const bare: { name: string; tags?: Tag[] }[] = [{ name: 'Bare' }];

		expect(filterByTags(bare, ['push-id'])).toEqual([]);
		expect(filterByTags(bare, [])).toHaveLength(1);
	});
});
