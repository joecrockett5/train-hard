import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real stack.
 *
 * They drive the app the way a person does -- no API calls to set up state,
 * except for creating the profile each test runs as, which the UI does on a
 * screen of its own and which has to be isolated per test anyway.
 *
 * Bring the stack up first:
 *
 *   docker compose up -d --wait
 *   cd frontend && npx playwright test
 *
 * The browser comes from `npx playwright install chromium`; CI does that in
 * the job. `E2E_BASE_URL` points the tests somewhere else -- the dev server
 * on 5173, say.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
	testDir: 'e2e',
	// The stack is shared, so tests make their own profile rather than
	// competing over one.
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI ? [['github'], ['list']] : 'list',
	timeout: 60_000,
	use: {
		baseURL,
		trace: 'retain-on-failure',
		// A phone, because that is what the app is for.
		...devices['Pixel 7']
	},
	projects: [
		{ name: 'phone', use: { ...devices['Pixel 7'] } },
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
		}
	]
});
