import { expect, test } from './fixtures';

/**
 * The settings screen, which is where every preference now lives.
 */
test('theme, units and the profile name all save from one screen', async ({ page, profile }) => {
	await page.goto('/settings');

	// ---- appearance -------------------------------------------------------
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

	await page.getByRole('radio', { name: 'Dark' }).check();
	await expect(page.getByText('Saved')).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	// It is stored on the profile, so a full load paints it with no flash --
	// the attribute is in the server's markup, before any JS has run.
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	// ---- units ------------------------------------------------------------
	await page.getByRole('radio', { name: 'Pounds' }).check();
	await expect(page.getByText('Saved')).toBeVisible();

	// The unit the whole app shows weights in, including what a typed number
	// is read as. `.first()` is the screen header's button; the empty state
	// offers the same thing in the same words.
	await page.goto('/body-weight');
	await page.getByRole('button', { name: 'Add weigh-in' }).first().click();
	await expect(page.getByLabel('Weight (lbs)')).toBeVisible();
	await page.getByRole('button', { name: 'Close' }).click();

	// ---- the name ---------------------------------------------------------
	await page.goto('/settings');
	await page.getByLabel('Display name').fill(`${profile} renamed`);
	await page.getByRole('button', { name: 'Rename' }).click();
	await expect(page.getByText('Name saved')).toBeVisible();

	await page.reload();
	await expect(page.getByRole('heading', { name: `${profile} renamed`, level: 1 })).toBeVisible();
});

test('switching profile sends you back to the picker', async ({ page }) => {
	await page.goto('/settings');
	await page.getByRole('button', { name: 'Switch profile' }).click();

	await expect(page).toHaveURL(/\/profiles$/);
	await expect(page.getByRole('heading', { name: 'Choose a profile' })).toBeVisible();

	// And the gate holds: nothing is reachable without a profile.
	await page.goto('/workouts');
	await expect(page).toHaveURL(/\/profiles/);
});
