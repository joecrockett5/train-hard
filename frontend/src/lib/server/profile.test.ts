import { describe, expect, it } from 'vitest';
import { profileCookieOptions, themeClass, themeCookieOptions, toProfile } from './profile';

describe('profileCookieOptions', () => {
	it('omits Secure over plain HTTP', () => {
		// SvelteKit defaults `secure` to true for any host but localhost, and a
		// browser silently discards a Secure cookie served over HTTP. That made
		// selecting a profile appear to do nothing on an http:// deployment.
		expect(profileCookieOptions(new URL('http://training.jmedia/profiles')).secure).toBe(false);
	});

	it('sets Secure over HTTPS, with no configuration change', () => {
		expect(profileCookieOptions(new URL('https://training.jmedia/profiles')).secure).toBe(true);
	});

	it('is not Secure on a plain-HTTP localhost either', () => {
		expect(profileCookieOptions(new URL('http://localhost:3000/profiles')).secure).toBe(false);
	});

	it('keeps the attributes the rest of the app depends on', () => {
		const options = profileCookieOptions(new URL('http://training.jmedia/'));

		expect(options.path).toBe('/');
		expect(options.httpOnly).toBe(true);
		expect(options.sameSite).toBe('lax');
		expect(options.maxAge).toBeGreaterThan(0);
	});
});

describe('themeCookieOptions', () => {
	it('matches the profile cookie, so both survive the same deployment', () => {
		// A Secure theme cookie over plain HTTP would be discarded, leaving a
		// dark profile painting light on every load.
		expect(themeCookieOptions(new URL('http://training.jmedia/'))).toEqual(
			profileCookieOptions(new URL('http://training.jmedia/'))
		);
		expect(themeCookieOptions(new URL('https://training.jmedia/')).secure).toBe(true);
	});
});

describe('themeClass', () => {
	it('is the class Tailwind looks for, or nothing', () => {
		expect(themeClass(true)).toBe('dark');
		expect(themeClass(false)).toBe('');
	});
});

describe('toProfile', () => {
	it("renames the backend's fields", () => {
		expect(toProfile({ object_id: 'p1', name: 'Joe', dark_mode: true })).toEqual({
			objectId: 'p1',
			name: 'Joe',
			darkMode: true
		});
	});

	it('defaults dark mode off when the field is absent', () => {
		// A profile row written before dark_mode existed has no such key, and
		// must not come back with darkMode undefined.
		expect(toProfile({ object_id: 'p1', name: 'Joe' }).darkMode).toBe(false);
	});
});
