import { expect, signIn, test } from './helpers/auth';
import { expectNoCriticalA11yViolations } from './helpers/a11y';
import { dateFromToday } from './helpers/dates';
import { createE2EItem } from './helpers/supabase';

test('login page has no critical a11y violations', async ({ page }) => {
	await page.goto('/login');
	await expectNoCriticalA11yViolations(page);
});

test('dashboard has no critical a11y violations', async ({ page, testUser }) => {
	await signIn(page, testUser);
	await expectNoCriticalA11yViolations(page);
});

test('reminders page has no critical a11y violations', async ({ page, testUser }) => {
	await createE2EItem(testUser.id, {
		name: 'A11y Reminder Target',
		billing_anchor_date: dateFromToday(7)
	});

	await signIn(page, testUser);
	await page.goto('/reminders');
	await expect(page.getByRole('heading', { name: 'Reminders' })).toBeVisible();
	await expectNoCriticalA11yViolations(page);
});

test('new-item page has no critical a11y violations', async ({ page, testUser }) => {
	await signIn(page, testUser);
	await page.goto('/items/new');
	await expect(page.getByRole('heading', { name: 'New item' })).toBeVisible();
	await expectNoCriticalA11yViolations(page);
});

test('edit page has no critical a11y violations', async ({ page, testUser }) => {
	const itemId = await createE2EItem(testUser.id, { name: 'A11y Edit Target' });

	await signIn(page, testUser);
	await page.goto(`/items/${itemId}`);
	await expect(page.getByRole('heading', { name: 'Edit A11y Edit Target' })).toBeVisible();
	await expectNoCriticalA11yViolations(page);
});

test('mobile dashboard has no critical a11y violations', async ({ page, testUser }, testInfo) => {
	test.skip(testInfo.project.name !== 'webkit-mobile', 'Mobile-only coverage.');

	await createE2EItem(testUser.id, { name: 'A11y Mobile Target' });
	await signIn(page, testUser);
	await expectNoCriticalA11yViolations(page);
});
