import type { Page } from '@playwright/test';

import { expect, signIn, test } from './helpers/auth';

type FillItem = (page: Page) => Promise<void>;

test.beforeEach(async ({ page, testUser }) => {
	await signIn(page, testUser);
});

async function createItem(page: Page, name: string, fill: FillItem): Promise<void> {
	await page.getByRole('link', { name: 'Add item' }).click();
	await expect(page.getByRole('heading', { name: 'New item' })).toBeVisible();
	await expect(page.locator('main form').filter({ has: page.getByLabel('Type') })).toHaveAttribute(
		'data-enhanced',
		'true'
	);

	await page.getByLabel('Name').fill(name);
	await fill(page);
	await page.getByRole('button', { name: 'Create', exact: true }).click();

	await expect(page.getByRole('heading', { name: `Edit ${name}` })).toBeVisible();
}

test('creates a subscription item', async ({ page }) => {
	const name = `Netflix ${crypto.randomUUID()}`;

	await createItem(page, name, async (form) => {
		await form.getByLabel('Type').selectOption('subscription');
		await expect(form.getByLabel('Type')).toHaveValue('subscription');
		await form.getByLabel('Billing cycle').selectOption('monthly');
		await form.getByLabel('Billing anchor date').fill('2026-06-01');
		await form.getByLabel('Amount').fill('9.99');
		await form.getByLabel('Currency').selectOption('USD');
		await expect(form.getByLabel('Currency')).toHaveValue('USD');
	});
});

test('creates an expiry-only item', async ({ page }) => {
	const name = `Domain ${crypto.randomUUID()}`;

	await createItem(page, name, async (form) => {
		await form.getByLabel('Type').selectOption('expiry');
		await expect(form.getByLabel('Type')).toHaveValue('expiry');
		await expect(form.getByLabel('Billing cycle')).toBeHidden();
		await form.getByLabel('Expiry date').fill('2027-06-01');
	});
});

test('creates a hybrid item', async ({ page }) => {
	const name = `SSL ${crypto.randomUUID()}`;

	await createItem(page, name, async (form) => {
		await form.getByLabel('Type').selectOption('hybrid');
		await expect(form.getByLabel('Type')).toHaveValue('hybrid');
		await expect(form.getByLabel('Expiry date')).toBeVisible();
		await form.getByLabel('Billing cycle').selectOption('yearly');
		await form.getByLabel('Billing anchor date').fill('2026-06-01');
		await form.getByLabel('Expiry date').fill('2027-06-01');
		await form.getByLabel('Amount').fill('19.99');
		await form.getByLabel('Currency').selectOption('USD');
	});
});

test('edits and deletes an item', async ({ page }) => {
	const name = `Editable ${crypto.randomUUID()}`;
	const updatedName = `${name} v2`;

	await createItem(page, name, async (form) => {
		await form.getByLabel('Billing cycle').selectOption('monthly');
		await form.getByLabel('Billing anchor date').fill('2026-06-01');
	});

	await page.getByLabel('Name').fill(updatedName);
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('heading', { name: `Edit ${updatedName}` })).toBeVisible();

	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await page.getByRole('button', { name: 'Delete item' }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText(updatedName)).toHaveCount(0);
});
