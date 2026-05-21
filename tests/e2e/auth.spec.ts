import { expect, signIn, test } from './helpers/auth';

test('redirects to login when unauthenticated', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
});

test('rejects wrong password with a generic message', async ({ page, testUser }) => {
	await page.goto('/login');
	await page.getByLabel('Email').fill(testUser.email);
	await page.getByLabel('Password').fill('wrong-password');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
});

test('signs in and shows the dashboard', async ({ page, testUser }) => {
	await signIn(page, testUser);
});

test('auth cookies are HttpOnly and SameSite=Lax', async ({ page, context, baseURL, testUser }) => {
	await signIn(page, testUser);

	const cookies = await context.cookies();
	const authCookies = cookies.filter((cookie) => cookie.name.startsWith('sb-'));
	expect(authCookies.length).toBeGreaterThan(0);

	for (const cookie of authCookies) {
		expect(cookie.httpOnly).toBe(true);
		expect(cookie.sameSite).toBe('Lax');

		if (baseURL?.startsWith('https://')) {
			expect(cookie.secure).toBe(true);
		}
	}
});

test('signs out and redirects protected routes back to login', async ({ page, testUser }) => {
	await signIn(page, testUser);
	await page.getByRole('button', { name: /Sign out/ }).click();

	await expect(page).toHaveURL(/\/login/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
});
