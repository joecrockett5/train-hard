/**
 * Every user-facing string in the app.
 *
 * `main` and `japanese` exist as two branches because the strings were
 * written into the markup, so translating the UI meant forking the app and
 * every non-string change then had to land twice. Routing them all through
 * here makes the Japanese UI a catalogue rather than a branch: add
 * `src/lib/i18n/ja.ts`, register it below, and `UI_LOCALE=ja` serves it.
 *
 * The locale is fixed for the life of the server process -- it comes from an
 * environment variable, not from a header or a user preference -- so this is
 * a plain module variable rather than a store. Nothing re-renders when it
 * changes, because it never changes while anything is rendering.
 */

import { en } from './en';

const CATALOGUES = {
	en
	// ja  <- add here; the type below then requires it to be complete
};

export type Locale = keyof typeof CATALOGUES;
export type Strings = typeof en;

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALES = Object.keys(CATALOGUES) as Locale[];

/** Whether `value` names a catalogue that exists, for reading env and cookies. */
export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && value in CATALOGUES;
}

let active: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale): void {
	active = locale;
}

export function currentLocale(): Locale {
	return active;
}

/**
 * The active catalogue, as a plain object.
 *
 * A proxy so that call sites are `t.nav.workouts` with no ceremony and no
 * stale capture: the lookup happens when the string is read, which matters
 * during SSR, where the locale is set from the environment after this module
 * has already been imported.
 */
export const t = new Proxy({} as Strings, {
	get: (_target, key) => CATALOGUES[active][key as keyof Strings],
	has: (_target, key) => key in CATALOGUES[active],
	ownKeys: () => Reflect.ownKeys(CATALOGUES[active]),
	getOwnPropertyDescriptor: (_target, key) =>
		Reflect.getOwnPropertyDescriptor(CATALOGUES[active], key)
});

/** The BCP-47 tag for `Intl` and the document's `lang`. */
export function localeTag(locale: Locale = active): string {
	return CATALOGUES[locale].meta.tag;
}
