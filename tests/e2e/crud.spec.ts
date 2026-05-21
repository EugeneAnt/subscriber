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

async function chooseOption(page: Page, label: string, option: string): Promise<void> {
	await page.getByLabel(label, { exact: true }).click();
	await page.getByRole('option', { name: option, exact: true }).click();
}

async function setDateField(page: Page, name: string, value: string): Promise<void> {
	await page.locator(`input[type="hidden"][name="${name}"]`).evaluate((input, nextValue) => {
		const field = input as HTMLInputElement;
		field.value = nextValue;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		field.dispatchEvent(new Event('change', { bubbles: true }));
	}, value);
}

test('creates a subscription item', async ({ page }) => {
	const name = `Netflix ${crypto.randomUUID()}`;

	await createItem(page, name, async (form) => {
		await chooseOption(form, 'Type', 'Subscription');
		await expect(form.getByLabel('Type')).toContainText('Subscription');
		await chooseOption(form, 'Billing cycle', 'Monthly');
		await form.getByLabel('Amount').fill('9.99');
		await chooseOption(form, 'Currency', 'USD');
		await expect(form.getByLabel('Currency')).toContainText('USD');
		await setDateField(form, 'billing_anchor_date', '2026-06-01');
	});
});

test('creates an expiry-only item', async ({ page }) => {
	const name = `Domain ${crypto.randomUUID()}`;

	await createItem(page, name, async (form) => {
		await chooseOption(form, 'Type', 'Expiry only');
		await expect(form.getByLabel('Type')).toContainText('Expiry only');
		await expect(form.getByLabel('Billing cycle')).toBeHidden();
		await setDateField(form, 'expiry_date', '2027-06-01');
	});
});

test('creates a hybrid item', async ({ page }) => {
	const name = `SSL ${crypto.randomUUID()}`;

	await createItem(page, name, async (form) => {
		await chooseOption(form, 'Type', 'Hybrid');
		await expect(form.getByLabel('Type')).toContainText('Hybrid');
		await expect(form.getByLabel('Expiry date')).toBeVisible();
		await chooseOption(form, 'Billing cycle', 'Yearly');
		await form.getByLabel('Amount').fill('19.99');
		await chooseOption(form, 'Currency', 'USD');
		await setDateField(form, 'billing_anchor_date', '2026-06-01');
		await setDateField(form, 'expiry_date', '2027-06-01');
	});
});

test('edits and deletes an item', async ({ page }) => {
	const name = `Editable ${crypto.randomUUID()}`;
	const updatedName = `${name} v2`;

	await createItem(page, name, async (form) => {
		await chooseOption(form, 'Billing cycle', 'Monthly');
		await setDateField(form, 'billing_anchor_date', '2026-06-01');
	});

	await page.getByLabel('Name').fill(updatedName);
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('heading', { name: `Edit ${updatedName}` })).toBeVisible();

	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await page.getByRole('button', { name: 'Delete item' }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText(updatedName)).toHaveCount(0);
});
