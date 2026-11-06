import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// adapter-node, deliberately. The ORIGIN / PROTOCOL_HEADER /
		// HOST_HEADER handling the README documents is this adapter's, and it
		// is what lets the app sit behind a reverse proxy serving http and
		// https at once. See the README's "Running it on a server".
		adapter: adapter(),

		alias: {
			$ui: 'src/lib/ui',
			$components: 'src/lib/components'
		}
	}
};

export default config;
