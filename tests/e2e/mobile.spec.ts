import { expect, signIn, test } from './helpers/auth';
import { dateFromToday } from './helpers/dates';
import { createE2EItem } from './helpers/supabase';

test('dashboard uses mobile cards with 44px tap targets', async ({ page, testUser }, testInfo) => {
	test.skip(testInfo.project.name !== 'webkit-mobile', 'Mobile-only coverage.');

	await createE2EItem(testUser.id, {
		name: 'Mobile Card Target',
		category: 'Mobile',
		provider: 'E2E'
	});

	await signIn(page, testUser);

	await expect(page.locator('table')).toBeHidden();

	const cards = page.locator('ul.md\\:hidden a[href^="/items/"]');
	await expect(cards.first()).toBeVisible();

	for (let index = 0; index < (await cards.count()); index += 1) {
		const box = await cards.nth(index).boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
	}

	const actionButtons = page.getByRole('button', { name: /Open actions for/ });
	await expect(actionButtons.first()).toBeVisible();

	for (let index = 0; index < (await actionButtons.count()); index += 1) {
		const box = await actionButtons.nth(index).boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
	}
});

test('reminders page uses mobile-friendly action targets', async ({ page, testUser }, testInfo) => {
	test.skip(testInfo.project.name !== 'webkit-mobile', 'Mobile-only coverage.');

	await createE2EItem(testUser.id, {
		name: 'Mobile Reminder Target',
		billing_anchor_date: dateFromToday(7)
	});

	await signIn(page, testUser);
	await page.goto('/reminders');

	const actions = page.locator('form button');
	await expect(actions.first()).toBeVisible();

	for (let index = 0; index < (await actions.count()); index += 1) {
		const box = await actions.nth(index).boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
	}
});

test('pay-as-you-go controls are touch friendly on mobile', async ({ page, testUser }, testInfo) => {
	test.skip(testInfo.project.name !== 'webkit-mobile', 'Mobile-only coverage.');

	await signIn(page, testUser);
	await page.getByRole('link', { name: 'Pay-as-you-go' }).click();

	const paygLink = page.getByRole('link', { name: 'Pay-as-you-go' });
	await expect(paygLink).toBeVisible();
	const linkBox = await paygLink.boundingBox();
	expect(linkBox?.height ?? 0).toBeGreaterThanOrEqual(44);
	expect(linkBox?.width ?? 0).toBeGreaterThanOrEqual(44);

	const refresh = page.getByRole('button', { name: 'Refresh' });
	if (await refresh.isVisible()) {
		const box = await refresh.boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
	}
});
