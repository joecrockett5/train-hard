// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/** Active profile id, read from the profileId cookie in hooks.server.ts. */
			profileId?: string;
			/** '' or 'dark', put on <html> so the first paint is the right theme. */
			theme: string;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
