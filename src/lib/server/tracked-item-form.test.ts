import { describe, expect, test } from 'vitest';
import { superValidate } from 'sveltekit-superforms/server';

import {
	newTrackedItemDefaults,
	newTrackedItemForm,
	trackedItemDataFromRow,
	trackedItemFormAdapter
} from './tracked-item-form';

describe('tracked item form helpers', () => {
	test('provides create defaults for a subscription form', () => {
		expect(newTrackedItemDefaults).toMatchObject({
			name: '',
			type: 'subscription',
			billing_cycle: 'monthly',
			custom_cycle_days: null,
			billing_anchor_date: null,
			amount: null,
			currency: null,
			expiry_date: null,
			status: 'active',
			category: null,
			provider: null,
			notes: null
		});
	});

	test('initializes the create form without visible validation errors', async () => {
		const form = await newTrackedItemForm();

		expect(form.data).toMatchObject(newTrackedItemDefaults);
		expect(form.errors).toEqual({});
	});

	test('validates submitted form data through the shared adapter', async () => {
		const formData = new FormData();
		formData.set('name', ' OpenAI ');
		formData.set('type', 'subscription');
		formData.set('billing_cycle', 'monthly');
		formData.set('billing_anchor_date', '2026-05-20');
		formData.set('amount', '20.50');
		formData.set('currency', 'usd');
		formData.set('status', 'active');
		formData.set('category', ' AI ');
		formData.set('provider', ' OpenAI ');
		formData.set('notes', '');

		const form = await superValidate(formData, trackedItemFormAdapter);

		expect(form.valid).toBe(true);
		expect(form.data).toMatchObject({
			name: 'OpenAI',
			type: 'subscription',
			billing_cycle: 'monthly',
			billing_anchor_date: '2026-05-20',
			amount: 20.5,
			currency: 'USD',
			status: 'active',
			category: 'AI',
			provider: 'OpenAI',
			notes: null
		});
	});

	test('maps a tracked_items row into editable form data', () => {
		const result = trackedItemDataFromRow({
			name: 'Domain',
			type: 'hybrid',
			billing_cycle: 'yearly',
			custom_cycle_days: null,
			billing_anchor_date: '2026-06-01',
			amount: 12.5,
			currency: 'USD',
			expiry_date: '2027-06-01',
			status: 'active',
			category: 'Domains',
			provider: 'Registrar',
			notes: null
		});

		expect(result).toEqual({
			name: 'Domain',
			type: 'hybrid',
			billing_cycle: 'yearly',
			custom_cycle_days: null,
			billing_anchor_date: '2026-06-01',
			amount: 12.5,
			currency: 'USD',
			expiry_date: '2027-06-01',
			status: 'active',
			category: 'Domains',
			provider: 'Registrar',
			notes: null
		});
	});
});
