import { expect, signIn, test } from './helpers/auth';

test('pay-as-you-go tab shows missing provider configuration state', async ({ page, testUser }) => {
	await signIn(page, testUser);
	await page.getByRole('link', { name: 'Pay-as-you-go' }).click();

	await expect(page).toHaveURL(/tab=payg/);
	await expect(page.getByRole('heading', { name: 'Pay-as-you-go' })).toBeVisible();
	await expect(page.getByText('Provider cost sync is not configured')).toBeVisible();
});
