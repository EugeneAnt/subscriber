import { describe, expect, test } from 'vitest';
import { parse, safeParse } from 'valibot';

import { trackedItemSchema } from './tracked-item';

const baseSubscription = {
	name: 'Netflix',
	type: 'subscription',
	billing_cycle: 'monthly',
	custom_cycle_days: '',
	billing_anchor_date: '2026-06-01',
	amount: '9.99',
	currency: 'USD',
	expiry_date: '',
	status: 'active',
	category: '',
	provider: '',
	notes: ''
};

function expectInvalid(input: unknown): void {
	expect(safeParse(trackedItemSchema, input).success).toBe(false);
}

describe('trackedItemSchema', () => {
	test('accepts a valid subscription and normalizes form strings', () => {
		const result = parse(trackedItemSchema, {
			...baseSubscription,
			name: '  Netflix  ',
			currency: 'usd',
			category: '  Streaming  ',
			provider: '  Netflix  ',
			notes: '  Paid by card  '
		});

		expect(result).toMatchObject({
			name: 'Netflix',
			amount: 9.99,
			currency: 'USD',
			category: 'Streaming',
			provider: 'Netflix',
			notes: 'Paid by card'
		});
	});

	test('accepts an expiry item and converts blank optional fields to null', () => {
		const result = parse(trackedItemSchema, {
			...baseSubscription,
			type: 'expiry',
			billing_cycle: '',
			billing_anchor_date: '',
			amount: '',
			currency: '',
			expiry_date: '2026-09-01'
		});

		expect(result).toMatchObject({
			billing_cycle: null,
			billing_anchor_date: null,
			amount: null,
			currency: null,
			expiry_date: '2026-09-01',
			category: null,
			provider: null,
			notes: null
		});
	});

	test.each([
		['subscription without billing_cycle', { billing_cycle: '' }],
		['subscription without billing_anchor_date', { billing_anchor_date: '' }],
		['expiry without expiry_date', { type: 'expiry', billing_cycle: '', billing_anchor_date: '' }],
		[
			'expiry with billing_cycle but without billing_anchor_date',
			{
				type: 'expiry',
				billing_cycle: 'monthly',
				billing_anchor_date: '',
				expiry_date: '2026-09-01'
			}
		],
		['hybrid without billing_cycle', { type: 'hybrid', billing_cycle: '' }],
		['hybrid without expiry_date', { type: 'hybrid' }]
	])('rejects type-driven invalid input: %s', (_name, patch) => {
		expectInvalid({ ...baseSubscription, ...patch });
	});

	test('requires custom_cycle_days only for custom_days billing', () => {
		expectInvalid({ ...baseSubscription, billing_cycle: 'custom_days', custom_cycle_days: '' });
		expectInvalid({ ...baseSubscription, billing_cycle: 'custom_days', custom_cycle_days: '0' });
		expectInvalid({ ...baseSubscription, billing_cycle: 'custom_days', custom_cycle_days: '3651' });

		const result = parse(trackedItemSchema, {
			...baseSubscription,
			billing_cycle: 'custom_days',
			custom_cycle_days: '45'
		});
		expect(result.custom_cycle_days).toBe(45);
	});

	test.each([
		['amount without currency', { amount: '9.99', currency: '' }],
		['currency without amount', { amount: '', currency: 'USD' }],
		['negative amount', { amount: '-1', currency: 'USD' }],
		['amount above product cap', { amount: '10000000000', currency: 'USD' }],
		['non-numeric amount', { amount: 'abc', currency: 'USD' }],
		['invalid currency shape', { amount: '9.99', currency: 'US' }]
	])('rejects invalid amount/currency input: %s', (_name, patch) => {
		expectInvalid({ ...baseSubscription, ...patch });
	});

	test.each([
		['blank name', { name: '   ' }],
		['name over 200 chars', { name: 'a'.repeat(201) }],
		['category over 200 chars', { category: 'a'.repeat(201) }],
		['provider over 200 chars', { provider: 'a'.repeat(201) }],
		['notes over 5000 chars', { notes: 'a'.repeat(5001) }]
	])('rejects invalid text input: %s', (_name, patch) => {
		expectInvalid({ ...baseSubscription, ...patch });
	});

	test.each([
		['invalid calendar date', { billing_anchor_date: '2026-02-31' }],
		['wrong date format', { billing_anchor_date: '06/01/2026' }],
		['date below range', { billing_anchor_date: '1899-12-31' }],
		['date above range', { billing_anchor_date: '2101-01-01' }]
	])('rejects invalid date input: %s', (_name, patch) => {
		expectInvalid({ ...baseSubscription, ...patch });
	});
});
