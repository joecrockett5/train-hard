import { dialog, expect, test } from './fixtures';

/**
 * Several of these use `.first()`. The screen header's button and the empty
 * state's action deliberately say the same thing, and a weight appears both
 * on its card and in the chart's own summary -- right for a reader, ambiguous
 * for a locator.
 */
test('log a weigh-in and see it on the graph and the dashboard', async ({ page }) => {
	await page.goto('/body-weight');
	await expect(page.getByText(/No weigh-ins yet/).first()).toBeVisible();

	await page.getByRole('button', { name: 'Add weigh-in' }).first().click();

	const sheet = await dialog(page, 'Add a weigh-in');
	await sheet.getByLabel(/^Weight/).fill('81.25');
	await sheet.getByLabel('Notes').fill('After breakfast');
	await sheet.getByRole('button', { name: 'Add weigh-in' }).click();

	// Two decimal places, trailing zeros dropped.
	await expect(page.getByText('81.25kg').first()).toBeVisible();
	await expect(page.getByText('After breakfast')).toBeVisible();
	await expect(page.getByRole('img', { name: /Body weight over time/ })).toBeVisible();

	await page.goto('/');
	await expect(page.getByText('81.25').first()).toBeVisible();
});

test('kilograms are what is stored, whichever unit is shown', async ({ page }) => {
	await page.goto('/body-weight');
	await page.getByRole('button', { name: 'Add weigh-in' }).first().click();

	const sheet = await dialog(page, 'Add a weigh-in');
	await sheet.getByLabel('Weight (kg)').fill('80');
	await sheet.getByRole('button', { name: 'Add weigh-in' }).click();
	await expect(page.getByText('80kg').first()).toBeVisible();

	// Switch to pounds: the same reading, converted for display only.
	await page.goto('/settings');
	await page.getByRole('radio', { name: 'Pounds' }).check();
	await expect(page.getByText('Saved')).toBeVisible();

	await page.goto('/body-weight');
	await expect(page.getByText('176.37lbs').first()).toBeVisible();

	// And back again, with nothing lost in the round trip.
	await page.goto('/settings');
	await page.getByRole('radio', { name: 'Kilograms' }).check();
	await expect(page.getByText('Saved')).toBeVisible();

	await page.goto('/body-weight');
	await expect(page.getByText('80kg').first()).toBeVisible();
});
