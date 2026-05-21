import { expect, signIn, test } from './helpers/auth';
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
