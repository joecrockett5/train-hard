import type { BodyWeight, ProgressPhoto } from '$lib/types';
import { sortEntries } from '$lib/weight-chart';

/**
 * Picking two weigh-ins and lining one photo from each of them up.
 *
 * A photo carries no angle: nothing records that one is the front view and
 * another the back. So which of an earlier date's three photos belongs
 * beside which of a later date's three is not in the data, and there are
 * only two ways to answer it. Pairing by position is right for photos taken
 * in one session in the usual order and wrong the moment they are not, and
 * an angle on the record would have to be guessed for every photo already
 * stored.
 *
 * So position is the default and the reader can break it: `choosePhoto`
 * moves both sides together while they are linked, and one side alone once
 * they are not. The arithmetic lives here rather than in the page because
 * the clamping -- three photos on one date against one on the other -- is
 * the part worth testing without rendering anything.
 */

/** A weigh-in that has photos, with them. */
export type ComparableWeighIn = {
	entry: BodyWeight;
	photos: ProgressPhoto[];
};

/** The two weigh-ins on screen, by their ids. */
export type Pair = {
	earlierId: string;
	laterId: string;
};

/** Which photo each side is showing, as a position in that side's list. */
export type Chosen = {
	earlier: number;
	later: number;
};

export type Side = keyof Chosen;

/** How many photos each side has to choose from. */
export type Counts = Chosen;

/**
 * The weigh-ins worth offering, oldest first.
 *
 * Only ones with photos: a date with none has nothing to put beside
 * anything. Photos are ordered by when their row was written, which is the
 * order they were uploaded and so the order they were picked in -- the list
 * endpoint returns them in the table's own order, which is neither stable
 * nor meaningful.
 */
export function comparableWeighIns(
	entries: BodyWeight[],
	photos: ProgressPhoto[]
): ComparableWeighIn[] {
	const byEntry = photos.reduce((grouped: Map<string, ProgressPhoto[]>, photo) => {
		const forEntry = grouped.get(photo.bodyWeightId) ?? [];
		forEntry.push(photo);
		grouped.set(photo.bodyWeightId, forEntry);
		return grouped;
	}, new Map());

	return sortEntries(entries)
		.map((entry) => ({
			entry,
			photos: (byEntry.get(entry.objectId ?? '') ?? [])
				.slice()
				.sort(
					(a, b) =>
						(a.timestamp ?? '').localeCompare(b.timestamp ?? '') ||
						(a.objectId ?? '').localeCompare(b.objectId ?? '')
				)
		}))
		.filter((comparable) => comparable.photos.length > 0);
}

/**
 * The first comparison to show: the oldest and the newest.
 *
 * The point of the screen is a few months of change in one view, and that is
 * the widest pair there is. Nothing to show until two dates have photos.
 */
export function widestPair(comparable: ComparableWeighIn[]): Pair | null {
	if (comparable.length < 2) {
		return null;
	}

	return {
		earlierId: comparable[0].entry.objectId ?? '',
		laterId: comparable[comparable.length - 1].entry.objectId ?? ''
	};
}

/** The weigh-in with that id, or null -- a date can be deleted elsewhere. */
export function weighInById(
	comparable: ComparableWeighIn[],
	entryId: string
): ComparableWeighIn | null {
	return comparable.find((each) => each.entry.objectId === entryId) ?? null;
}

/**
 * The same position on a side that has a different number of photos.
 *
 * Three photos against one: the third pairs with the only one there is,
 * rather than with nothing.
 */
export function matchingIndex(index: number, count: number): number {
	if (count <= 0) {
		return 0;
	}

	return Math.min(Math.max(index, 0), count - 1);
}

/**
 * Choosing a photo on one side, and what that does to the other.
 *
 * Linked, the other side follows to the same position, which is the whole
 * comparison in one tap for photos taken in the usual order. Unlinked, the
 * other side stays where it was put.
 */
export function choosePhoto(
	chosen: Chosen,
	side: Side,
	index: number,
	counts: Counts,
	linked: boolean
): Chosen {
	const moved = matchingIndex(index, counts[side]);

	if (!linked) {
		return { ...chosen, [side]: moved };
	}

	const other: Side = side === 'earlier' ? 'later' : 'earlier';

	return { [side]: moved, [other]: matchingIndex(index, counts[other]) } as Chosen;
}

/**
 * Pulls a choice back inside the lists it indexes.
 *
 * Changing either date changes how many photos that side has, and a position
 * left over from a date with three photos would otherwise point past the end
 * of a date with one.
 */
export function clampChosen(chosen: Chosen, counts: Counts): Chosen {
	return {
		earlier: matchingIndex(chosen.earlier, counts.earlier),
		later: matchingIndex(chosen.later, counts.later)
	};
}
