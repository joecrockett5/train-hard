import { dialog, expect, test } from './fixtures';

/**
 * The flow the app exists for: start a workout, put an exercise in it with a
 * tag on it, and log a set.
 */
test('create a profile, log a workout, add a tagged exercise and a set', async ({ page }) => {
	await page.getByRole('button', { name: "Start today's workout" }).click();

	const sheet = await dialog(page, 'New workout');
	await sheet.getByLabel('Title').fill('Push day');
	await sheet.getByLabel('Notes').fill('Felt strong');
	await sheet.getByRole('button', { name: 'Start' }).click();

	await expect(page.getByRole('heading', { name: 'Push day', level: 1 })).toBeVisible();
	await expect(page.getByText('Felt strong')).toBeVisible();

	// ---- an exercise, with a tag made on the spot ------------------------
	// The screen header's button and the empty state's say the same
	// thing, which is right for a reader and ambiguous for a locator.
	await page.getByRole('button', { name: 'Add an exercise' }).first().click();

	const picker = await dialog(page, 'Add an exercise');
	await picker.getByRole('button', { name: 'New exercise' }).click();

	const creator = await dialog(page, 'New exercise');
	await creator.getByLabel('Name').fill('Bench press');
	await creator.getByLabel('Description').fill('Barbell, flat bench');
	await creator.getByPlaceholder('New tag').fill('Push');
	await creator.getByRole('button', { name: 'Add', exact: true }).click();
	// The tag is created and applied in one go, so it comes back selected.
	await expect(creator.getByRole('button', { name: 'Remove tag Push' })).toBeVisible();
	await creator.getByRole('button', { name: 'Add exercise' }).click();

	const card = page.getByRole('button', { name: 'Open Bench press' });
	await expect(card).toBeVisible();
	// The tag badge, on the collapsed card.
	await expect(card.getByText('Push', { exact: true })).toBeVisible();

	// ---- a set -----------------------------------------------------------
	await card.click();
	await page.getByRole('button', { name: 'Add a set' }).click();

	const logger = await dialog(page, 'Add a set');
	await logger.getByLabel('Reps').fill('5');
	await logger.getByLabel(/^Weight/).fill('82.5');
	await logger.getByRole('button', { name: 'Add', exact: true }).click();

	await expect(page.getByText('5 reps at 82.5kg').first()).toBeVisible();

	// ---- and it is still there after a reload ----------------------------
	await page.reload();
	await page.getByRole('button', { name: 'Open Bench press' }).click();
	await expect(page.getByText('5 reps at 82.5kg').first()).toBeVisible();
});

test('a workout is reachable from the dashboard and the calendar', async ({ page }) => {
	await page.getByRole('button', { name: "Start today's workout" }).click();

	const sheet = await dialog(page, 'New workout');
	await sheet.getByLabel('Title').fill('Leg day');
	await sheet.getByRole('button', { name: 'Start' }).click();
	await expect(page.getByRole('heading', { name: 'Leg day', level: 1 })).toBeVisible();

	await page.goto('/');
	await expect(page.getByRole('link', { name: 'Open Leg day' }).first()).toBeVisible();

	await page.goto('/workouts');
	// Today is selected, so today's workout is the one listed.
	await expect(page.getByRole('link', { name: 'Open Leg day' }).first()).toBeVisible();
});
