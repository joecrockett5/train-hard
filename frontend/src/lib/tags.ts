/**
 * Tag colours.
 *
 * A tag stores one colour. The badge derives its background, border and text
 * from that single value with `color-mix` (see `.tag-badge` in app.css), so
 * there is nothing to keep in step and the same tag reads correctly in both
 * themes.
 *
 * The stored value is the mid-tone, not the pastel: it is the text colour,
 * and the pale fill behind it is that colour at low opacity. Storing the
 * pale shade instead would leave nothing legible to write the label in.
 */

import type { Tag } from '$lib/types';

/**
 * The colours a new tag is given, in order of preference.
 *
 * Tailwind's 600 weights, which are the ones that hold up as text on both a
 * white and a near-black background. Hues are spaced around the wheel so
 * that two tags created in a row are easy to tell apart.
 */
export const TAG_COLOURS = [
	'#e11d48', // rose
	'#0284c7', // sky
	'#16a34a', // green
	'#d97706', // amber
	'#7c3aed', // violet
	'#0d9488', // teal
	'#db2777', // pink
	'#65a30d', // lime
	'#4f46e5', // indigo
	'#ea580c' // orange
] as const;

/**
 * A colour for a new tag: the first one nothing is using yet, so a profile
 * with a handful of tags gets a distinct colour for each without having to
 * choose one. Once they are all taken it wraps, which only matters past ten
 * tags and is better than refusing to make the eleventh.
 */
export function nextTagColour(existing: Tag[]): string {
	const taken = new Set(existing.map((tag) => tag.colorHex.toLowerCase()));
	const free = TAG_COLOURS.find((colour) => !taken.has(colour));

	return free ?? TAG_COLOURS[existing.length % TAG_COLOURS.length];
}

/** Tags in the order they should be shown: alphabetical, case-insensitive. */
export function sortTags(tags: Tag[]): Tag[] {
	return tags
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/** Whether `name` is already taken, ignoring case and surrounding space. */
export function tagNameTaken(tags: Tag[], name: string): boolean {
	const normalised = name.trim().toLowerCase();

	return tags.some((tag) => tag.name.trim().toLowerCase() === normalised);
}

/**
 * Exercises carrying at least one of `tagIds`.
 *
 * Any rather than all: the tags are workout types, so picking Push and Pull
 * means "the exercises I could do on either day", not "exercises that are
 * somehow both". Selecting nothing filters nothing.
 */
export function filterByTags<T extends { tags?: Tag[] }>(items: T[], tagIds: string[]): T[] {
	if (tagIds.length === 0) {
		return items;
	}

	const wanted = new Set(tagIds);

	return items.filter((item) => (item.tags ?? []).some((tag) => wanted.has(tag.objectId ?? '')));
}
