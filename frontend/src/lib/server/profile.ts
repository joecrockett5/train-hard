/** Cookie holding the active profile id. Read in hooks.server.ts. */
export const PROFILE_COOKIE = 'profileId';

export const PROFILE_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	maxAge: 60 * 60 * 24 * 365
} as const;
