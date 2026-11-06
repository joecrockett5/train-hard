import type { Locale } from '$lib/i18n';

declare global {
	namespace App {
		interface Locals {
			/** Active profile id, read from the profileId cookie in hooks.server.ts. */
			profileId?: string;
			/** 'light' or 'dark', put on <html> so the first paint is the right theme. */
			theme: 'light' | 'dark';
			/** The UI language this server is serving. */
			locale: Locale;
		}
	}
}

export {};
