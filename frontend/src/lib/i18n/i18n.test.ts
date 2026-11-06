import { describe, expect, it } from 'vitest';
import { currentLocale, DEFAULT_LOCALE, isLocale, localeTag, LOCALES, setLocale, t } from './index';
import { en } from './en';

/**
 * The catalogue is the contract a second locale has to satisfy, so these
 * check its shape rather than its wording -- a string changing is not a
 * regression, a key going missing is.
 */

/** Every leaf in the catalogue, as a dotted path and its value. */
function leaves(value: unknown, path: string[] = []): [string, unknown][] {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return [[path.join('.'), value]];
	}

	return Object.entries(value).flatMap(([key, child]) => leaves(child, [...path, key]));
}

describe('the catalogue', () => {
	const entries = leaves(en);

	it('has no empty strings, which render as a gap nobody can report', () => {
		for (const [path, value] of entries) {
			if (typeof value === 'string') {
				expect(value.trim(), path).not.toBe('');
			}

			if (Array.isArray(value)) {
				expect(value.length, path).toBeGreaterThan(0);
			}
		}
	});

	it('is strings, functions and the weekday arrays, and nothing else', () => {
		for (const [path, value] of entries) {
			if (Array.isArray(value)) {
				expect(
					value.every((each) => typeof each === 'string'),
					path
				).toBe(true);
				continue;
			}

			expect(['string', 'function'], path).toContain(typeof value);
		}
	});

	it('names a BCP-47 tag for Intl and for the document language', () => {
		expect(en.meta.tag).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
	});

	it('gives the calendar seven weekdays, and a name behind every initial', () => {
		expect(en.calendar.weekdaysNarrow).toHaveLength(7);
		expect(en.calendar.weekdays).toHaveLength(7);
	});

	it('pluralises rather than writing "1 workouts"', () => {
		expect(t.workouts.exerciseCount(1)).not.toContain('1 exercises');
		expect(t.photos.count(1)).toBe('1 photo');
		expect(t.photos.count(2)).toBe('2 photos');
	});

	it('interpolates inside the catalogue, so word order can be translated', () => {
		// Nothing assembles a sentence by concatenating at the call site,
		// which is the thing that cannot be translated.
		expect(t.exercises.matching(3, 12)).toContain('3');
		expect(t.exercises.matching(3, 12)).toContain('12');
	});
});

describe('the locale registry', () => {
	it('serves English by default', () => {
		expect(DEFAULT_LOCALE).toBe('en');
		expect(currentLocale()).toBe('en');
		expect(LOCALES).toContain('en');
	});

	it('recognises a locale that exists and refuses one that does not', () => {
		// This is what reads UI_LOCALE, so a typo has to fall back rather
		// than serve a catalogue of undefined.
		expect(isLocale('en')).toBe(true);
		expect(isLocale('ja')).toBe(false);
		expect(isLocale('')).toBe(false);
		expect(isLocale(undefined)).toBe(false);
	});

	it('reads the active catalogue when the string is read, not when imported', () => {
		// The locale is set after this module is imported -- from the
		// environment during SSR -- so `t` has to resolve late.
		setLocale('en');
		expect(t.app.name).toBe(en.app.name);
		expect(localeTag()).toBe(en.meta.tag);
	});

	it('exposes the catalogue to enumeration, so a missing key is findable', () => {
		expect(Object.keys(t)).toContain('dashboard');
		expect('settings' in t).toBe(true);
	});
});
