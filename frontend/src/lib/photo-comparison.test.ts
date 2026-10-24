import { describe, expect, it } from 'vitest';
import {
	choosePhoto,
	clampChosen,
	comparableWeighIns,
	matchingIndex,
	weighInById,
	widestPair
} from './photo-comparison';
import type { BodyWeight, ProgressPhoto } from './types';

function weighIn(objectId: string, entryDate: string): BodyWeight {
	return { objectId, entryDate, weight: 80, notes: '' };
}

function photo(objectId: string, bodyWeightId: string, timestamp: string): ProgressPhoto {
	return {
		objectId,
		bodyWeightId,
		timestamp,
		contentType: 'image/jpeg',
		width: 1200,
		height: 1600,
		byteSize: 200_000
	};
}

describe('comparableWeighIns', () => {
	it('offers only the weigh-ins that have photos', () => {
		// A date with no photos has nothing to put beside anything.
		const entries = [weighIn('a', '2026-01-01'), weighIn('b', '2026-02-01')];
		const photos = [photo('p1', 'b', '2026-02-01T08:00:00Z')];

		expect(comparableWeighIns(entries, photos).map((each) => each.entry.objectId)).toEqual(['b']);
	});

	it('orders them oldest first, by the day weighed rather than the row written', () => {
		const entries = [weighIn('b', '2026-02-01'), weighIn('a', '2026-01-01')];
		const photos = [
			photo('p1', 'a', '2026-03-01T08:00:00Z'),
			photo('p2', 'b', '2026-02-01T08:00:00Z')
		];

		expect(comparableWeighIns(entries, photos).map((each) => each.entry.objectId)).toEqual([
			'a',
			'b'
		]);
	});

	it('orders a weigh-in own photos by upload, which is the order they were picked', () => {
		const entries = [weighIn('a', '2026-01-01')];
		const photos = [
			photo('p3', 'a', '2026-01-01T08:00:02Z'),
			photo('p1', 'a', '2026-01-01T08:00:00Z'),
			photo('p2', 'a', '2026-01-01T08:00:01Z')
		];

		expect(comparableWeighIns(entries, photos)[0].photos.map((each) => each.objectId)).toEqual([
			'p1',
			'p2',
			'p3'
		]);
	});

	it('is unbothered by a photo whose weigh-in is not in the list', () => {
		// The page can delete a weigh-in without reloading every photo row.
		expect(comparableWeighIns([], [photo('p1', 'gone', '2026-01-01T08:00:00Z')])).toEqual([]);
	});
});

describe('widestPair', () => {
	it('starts on the oldest and the newest, which is the most change to see', () => {
		const comparable = comparableWeighIns(
			[weighIn('a', '2026-01-01'), weighIn('b', '2026-02-01'), weighIn('c', '2026-03-01')],
			[
				photo('p1', 'a', '2026-01-01T08:00:00Z'),
				photo('p2', 'b', '2026-02-01T08:00:00Z'),
				photo('p3', 'c', '2026-03-01T08:00:00Z')
			]
		);

		expect(widestPair(comparable)).toEqual({ earlierId: 'a', laterId: 'c' });
	});

	it('has no pair to offer when only one date has photos', () => {
		const comparable = comparableWeighIns(
			[weighIn('a', '2026-01-01')],
			[photo('p1', 'a', '2026-01-01T08:00:00Z')]
		);

		expect(widestPair(comparable)).toBeNull();
	});
});

describe('weighInById', () => {
	const comparable = comparableWeighIns(
		[weighIn('a', '2026-01-01')],
		[photo('p1', 'a', '2026-01-01T08:00:00Z')]
	);

	it('finds the weigh-in being shown', () => {
		expect(weighInById(comparable, 'a')?.entry.objectId).toBe('a');
	});

	it('returns null for a date that is no longer there', () => {
		expect(weighInById(comparable, 'b')).toBeNull();
	});
});

describe('matchingIndex', () => {
	it('keeps the position when the other side has that many photos', () => {
		expect(matchingIndex(2, 3)).toBe(2);
	});

	it('pairs with the last photo there is rather than with nothing', () => {
		// Three photos on one date against one on the other.
		expect(matchingIndex(2, 1)).toBe(0);
	});

	it('is unbothered by a side with no photos at all', () => {
		expect(matchingIndex(2, 0)).toBe(0);
	});

	it('never goes below the first photo', () => {
		expect(matchingIndex(-1, 3)).toBe(0);
	});
});

describe('choosePhoto', () => {
	const counts = { earlier: 3, later: 3 };

	it('moves both sides together while they are linked', () => {
		expect(choosePhoto({ earlier: 0, later: 0 }, 'earlier', 1, counts, true)).toEqual({
			earlier: 1,
			later: 1
		});
	});

	it('follows from either side', () => {
		expect(choosePhoto({ earlier: 0, later: 0 }, 'later', 2, counts, true)).toEqual({
			earlier: 2,
			later: 2
		});
	});

	it('clamps the side that is following, not the side that was tapped', () => {
		expect(
			choosePhoto({ earlier: 0, later: 0 }, 'earlier', 2, { earlier: 3, later: 2 }, true)
		).toEqual({ earlier: 2, later: 1 });
	});

	it('leaves the other side where it was put once unlinked', () => {
		// The point of unlinking: the photos were taken in a different order,
		// so position no longer pairs them.
		expect(choosePhoto({ earlier: 0, later: 2 }, 'earlier', 1, counts, false)).toEqual({
			earlier: 1,
			later: 2
		});
	});

	it('still clamps the tapped side when unlinked', () => {
		expect(
			choosePhoto({ earlier: 0, later: 0 }, 'later', 5, { earlier: 3, later: 2 }, false)
		).toEqual({ earlier: 0, later: 1 });
	});
});

describe('clampChosen', () => {
	it('pulls a choice back inside the lists it indexes after a date changes', () => {
		expect(clampChosen({ earlier: 2, later: 2 }, { earlier: 1, later: 3 })).toEqual({
			earlier: 0,
			later: 2
		});
	});

	it('leaves a choice that is already in range alone', () => {
		expect(clampChosen({ earlier: 1, later: 0 }, { earlier: 3, later: 3 })).toEqual({
			earlier: 1,
			later: 0
		});
	});
});
