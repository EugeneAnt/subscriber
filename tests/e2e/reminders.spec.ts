import { expect, signIn, test } from './helpers/auth';
import { dateFromToday } from './helpers/dates';
import { createE2EItem } from './helpers/supabase';

test.beforeEach(async ({ page, testUser }) => {
	await createE2EItem(testUser.id, {
		name: 'Reminder E2E Target',
		billing_anchor_date: dateFromToday(7),
		amount: 12,
		currency: 'USD'
	});

	await signIn(page, testUser);
});

test('shows due reminder count and reminder page', async ({ page }) => {
	await expect(page.getByRole('link', { name: /unread reminders/ })).toBeVisible();
	await page.getByRole('link', { name: /unread reminders/ }).click();

	await expect(page).toHaveURL(/\/reminders$/);
	await expect(page.getByRole('heading', { name: 'Reminders' })).toBeVisible();
	await expect(page.getByText('Reminder E2E Target')).toBeVisible();
	await expect(page.getByText('7 days before')).toBeVisible();
});

test('marks reminder read while keeping it visible', async ({ page }) => {
	await page.goto('/reminders');
	await page.getByRole('button', { name: 'Mark read' }).click();

	await expect(page.getByText('Reminder marked read')).toBeVisible();
	await expect(page.getByText('Reminder E2E Target')).toBeVisible();
	await expect(page.getByText('Read', { exact: true })).toBeVisible();
});

test('snoozes reminder until tomorrow', async ({ page }) => {
	await page.goto('/reminders');
	await page.getByRole('button', { name: 'Snooze' }).click();

	await expect(page.getByText('Reminder snoozed')).toBeVisible();
	await expect(page.getByText('No reminders due')).toBeVisible();
});

test('dismisses reminder', async ({ page }) => {
	await page.goto('/reminders');
	await page.getByRole('button', { name: 'Dismiss' }).click();

	await expect(page.getByText('Reminder dismissed')).toBeVisible();
	await expect(page.getByText('No reminders due')).toBeVisible();
});
