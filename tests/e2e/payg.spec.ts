import { expect, signIn, test } from './helpers/auth';
import { createE2EProviderConnection } from './helpers/supabase';

test('pay-as-you-go tab shows missing provider configuration state', async ({ page, testUser }) => {
	await signIn(page, testUser);
	await page.getByRole('link', { name: 'Pay-as-you-go' }).click();

	await expect(page).toHaveURL(/tab=payg/);
	await expect(page.getByRole('heading', { name: 'Pay-as-you-go' })).toBeVisible();
	await expect(page.getByText('Provider cost sync is not configured')).toBeVisible();
});

test('provider budget endpoint updates a user-owned connection without page navigation', async ({
	page,
	testUser
}) => {
	const connectionId = await createE2EProviderConnection(testUser.id);

	await signIn(page, testUser);

	const { ok, body } = await page.evaluate(async (id) => {
		const form = new FormData();
		form.set('monthly_budget', '25');
		form.set('warning_remaining_amount', '5');
		form.set('critical_remaining_amount', '1');

		const response = await fetch(`/provider-costs/${id}/budget`, {
			method: 'POST',
			body: form,
			headers: { accept: 'application/json' }
		});

		return {
			ok: response.ok,
			body: await response.json()
		};
	}, connectionId);

	expect(ok, JSON.stringify(body)).toBe(true);
	expect(body).toMatchObject({
		connection: {
			id: connectionId,
			monthly_budget: 25,
			remaining_budget: null,
			budget_status: 'unknown'
		}
	});
	await expect(page).toHaveURL(/\/$/);
});
