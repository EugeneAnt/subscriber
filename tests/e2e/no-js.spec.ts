import { expect, test } from './helpers/auth';

test.use({ javaScriptEnabled: false });

test('login works without JavaScript', async ({ page, testUser }) => {
	await page.goto('/login');
	await page.locator('#email').fill(testUser.email);
	await page.locator('#password').fill(testUser.password);
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
