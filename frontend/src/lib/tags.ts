/**
 * Tag colours.
 *
 * A tag stores one colour. The badge derives its background, border and text
 * from that single value with `color-mix` (see TagBadge.svelte), so
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
 * Ten mid-tones that pass, in both themes against both card surfaces, the
 * lightness band, the chroma floor, protan and deutan separation on every
 * adjacent pair, the normal-vision floor and 3:1 contrast. That is what lets
 * a tag go on storing one hex and still read on white and on near-black.
 *
 * The list deliberately contains no orange and no red: a tag must never be
 * mistakable for the brand ramp or for a delete. It is ordered for
 * consecutive distinctness, because this order is also the assignment order
 * -- the first two tags a profile makes should not be two neighbouring blues.
 *
 * Tags created before this list keep whatever they were stored with. Nothing
 * is rewritten; this only governs what the next tag is given.
 */
export const TAG_COLOURS = [
	'#d6336c', // raspberry
	'#1c7ed6', // blue
	'#2f9e44', // green
	'#ae3ec9', // grape
	'#0ca678', // teal
	'#7048e8', // violet
	'#b07a00', // bronze
	'#0b8ca8', // cyan
	'#4263eb', // indigo
	'#6b9b10' // olive
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
