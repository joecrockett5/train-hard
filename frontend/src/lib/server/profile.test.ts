import { describe, expect, it } from 'vitest';
import { profileCookieOptions } from './profile';

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
