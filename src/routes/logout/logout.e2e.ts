import { expect, test } from '@playwright/test';

test('POST /logout redirects to the login page', async ({ request }) => {
	const response = await request.post('/logout', { maxRedirects: 0 });

	expect(response.status()).toBe(303);
	expect(response.headers()['location']).toBe('/login');
});
