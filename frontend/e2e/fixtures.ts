import { test as base, expect, type Page } from '@playwright/test';

/**
 * A profile per test.
 *
 * The stack is shared and the tests run in parallel, so each one makes its
 * own profile through the picker and works inside it. That is also the first
 * flow worth covering, so it is exercised on every run rather than once.
 */
export const test = base.extend<{ profile: string }>({
	/*
	 * `auto`, because a fixture a test does not name is never instantiated --
	 * and without it every test starts with no profile cookie and is bounced
	 * to the picker by the route gate.
	 */
	profile: [
		async ({ page }, use, testInfo) => {
			const name = `e2e ${testInfo.project.name} ${testInfo.testId}`;

			await page.goto('/profiles');
			await page.getByLabel('New profile').fill(name);
			await page.getByRole('button', { name: 'Create' }).click();

			// Landing on the dashboard is what says the cookie was accepted.
			await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

			await use(name);
		},
		{ auto: true }
	]
});

export { expect };

/** Opens the sheet or dialog with this title and waits for it to settle. */
export async function dialog(page: Page, title: string) {
	const panel = page.getByRole('dialog', { name: title });
	await expect(panel).toBeVisible();
	return panel;
}
