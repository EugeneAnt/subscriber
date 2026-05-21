import { expect, signIn, test } from './helpers/auth';
import { createE2EItem } from './helpers/supabase';

test('filters survive reload via URL params', async ({ page, testUser }) => {
	await createE2EItem(testUser.id, {
		name: 'Paused Filter Target',
		status: 'paused',
		category: 'E2E Category',
		provider: 'E2E Provider'
	});
	await createE2EItem(testUser.id, {
		name: 'Active Filter Decoy',
		status: 'active',
		category: 'E2E Category',
		provider: 'E2E Provider'
	});

	await signIn(page, testUser);
	await page.goto('/?status=paused&category=E2E+Category&provider=E2E+Provider');

	const allItems = page.getByRole('region', { name: 'All items' });
	await expect(page).toHaveURL(/status=paused/);
	await expect(allItems.getByRole('link', { name: 'Paused Filter Target' })).toBeVisible();
	await expect(allItems.getByRole('link', { name: 'Active Filter Decoy' })).toHaveCount(0);

	await page.reload();
	await expect(page).toHaveURL(/status=paused/);
	await expect(allItems.getByRole('link', { name: 'Paused Filter Target' })).toBeVisible();
});
