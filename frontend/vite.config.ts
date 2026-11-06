import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	preview: {
		port: 8765
	},
	server: {
		// Bound wide so the dev container's port mapping reaches it, and so a
		// phone on the same network can load the dev server.
		host: '0.0.0.0',
		port: 5173
	}
});
