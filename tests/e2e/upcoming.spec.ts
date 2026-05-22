import { expect, signIn, test } from './helpers/auth';
import { dateFromToday } from './helpers/dates';
import { createE2EItem } from './helpers/supabase';

test('upcoming events show relative date labels', async ({ page, testUser }) => {
	await createE2EItem(testUser.id, {
		name: 'Upcoming Billing Target',
		billing_anchor_date: dateFromToday(3)
	});
	await createE2EItem(testUser.id, {
		name: 'Upcoming Expiry Target',
		type: 'expiry',
		billing_cycle: null,
		billing_anchor_date: null,
		expiry_date: dateFromToday(5)
	});

	await signIn(page, testUser);

	const upcoming = page.getByLabel('Upcoming events');
	await expect(upcoming.getByRole('link', { name: 'Upcoming Billing Target' })).toBeVisible();
	await expect(upcoming.getByText('Due in 3 days')).toBeVisible();
	await expect(upcoming.getByRole('link', { name: 'Upcoming Expiry Target' })).toBeVisible();
	await expect(upcoming.getByText('Expires in 5 days')).toBeVisible();
});
