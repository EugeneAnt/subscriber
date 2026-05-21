import { expect, test as base, type Page } from '@playwright/test';

import { createE2EUser, deleteE2EUser, type E2EUser } from './supabase';

type Fixtures = {
	testUser: E2EUser;
};

export const test = base.extend<Fixtures>({
	testUser: async ({}, use) => {
		const user = await createE2EUser();

		try {
			await use(user);
		} finally {
			await deleteE2EUser(user.id);
		}
	}
});

export { expect };
export type { E2EUser };

export async function signIn(page: Page, user: E2EUser): Promise<void> {
	await page.goto('/login');
	await page.getByLabel('Email').fill(user.email);
	await page.getByLabel('Password').fill(user.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
