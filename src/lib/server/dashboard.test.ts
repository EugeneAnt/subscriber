import { describe, expect, test } from 'vitest';

import {
	getDashboardSummary,
	getDistinctOptions,
	parseDashboardFilters,
	toDashboardBurn,
	toDashboardEvents,
	toDashboardItems,
	toDashboardPaygSpend
} from './dashboard';

describe('dashboard helpers', () => {
	test('keeps only valid URL filter values', () => {
		const params = new URLSearchParams({
			type: 'hybrid',
			status: 'expired',
			category: ' Domains ',
			provider: '',
			unused: 'ignored'
		});

		expect(parseDashboardFilters(params)).toEqual({
			type: 'hybrid',
			status: 'expired',
			category: 'Domains'
		});

		expect(parseDashboardFilters(new URLSearchParams({ type: 'other', status: 'stale' }))).toEqual(
			{}
		);
	});

	test('drops view rows without stable identity fields before rendering', () => {
		const rows = toDashboardItems([
			{ id: 'item-1', name: 'Netflix', type: 'subscription', effective_status: 'active' },
			{ id: null, name: 'Missing id', type: 'subscription', effective_status: 'active' },
			{ id: 'item-2', name: null, type: 'subscription', effective_status: 'active' }
		]);

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ id: 'item-1', name: 'Netflix' });
	});

	test('normalizes event and burn rows for UI components', () => {
		expect(
			toDashboardEvents([
				{
					tracked_item_id: 'item-1',
					name: 'Domain',
					event_kind: 'expiry',
					event_date: '2026-06-10'
				},
				{
					tracked_item_id: 'item-2',
					name: 'Broken',
					event_kind: 'other',
					event_date: '2026-06-10'
				},
				{ tracked_item_id: 'item-3', name: null, event_kind: 'billing', event_date: '2026-06-10' }
			])
		).toEqual([
			expect.objectContaining({
				tracked_item_id: 'item-1',
				name: 'Domain',
				event_kind: 'expiry',
				event_date: '2026-06-10'
			})
		]);

		expect(
			toDashboardBurn([
				{ currency: 'USD', monthly_burn: 12.5 },
				{ currency: 'GBP', monthly_burn: '7.25' },
				{ currency: null, monthly_burn: 20 },
				{ currency: 'EUR', monthly_burn: null },
				{ currency: 'KZT', monthly_burn: '' },
				{ currency: 'RUB', monthly_burn: 'not-a-number' }
			] as Parameters<typeof toDashboardBurn>[0])
		).toEqual([
			{ currency: 'USD', monthly_burn: 12.5 },
			{ currency: 'GBP', monthly_burn: 7.25 }
		]);

		expect(
			toDashboardPaygSpend([
				{
					current_period_currency: 'USD',
					current_period_spend: 2.5
				},
				{
					current_period_currency: 'USD',
					current_period_spend: 3.25
				},
				{
					current_period_currency: 'EUR',
					current_period_spend: 1
				},
				{
					current_period_currency: null,
					current_period_spend: 10
				},
				{
					current_period_currency: 'KZT',
					current_period_spend: null
				}
			] as Parameters<typeof toDashboardPaygSpend>[0])
		).toEqual([
			{ currency: 'EUR', current_month_spend: 1 },
			{ currency: 'USD', current_month_spend: 5.75 }
		]);
	});

	test('summarizes all items and upcoming events independent of table filters', () => {
		const items = toDashboardItems([
			{ id: 'item-1', name: 'Netflix', type: 'subscription', effective_status: 'active' },
			{ id: 'item-2', name: 'Old domain', type: 'expiry', effective_status: 'expired' },
			{ id: 'item-3', name: 'Paused service', type: 'subscription', effective_status: 'paused' }
		]);
		const events = toDashboardEvents([
			{
				tracked_item_id: 'item-1',
				name: 'Netflix',
				event_kind: 'billing',
				event_date: '2026-06-10'
			},
			{
				tracked_item_id: 'item-2',
				name: 'Domain',
				event_kind: 'expiry',
				event_date: '2026-07-25'
			}
		]);

		expect(getDashboardSummary(items, events, '2026-05-20')).toEqual({
			activeCount: 1,
			upcoming30Count: 1
		});
	});

	test('deduplicates filter options from the full item set', () => {
		const items = toDashboardItems([
			{
				id: 'item-1',
				name: 'Netflix',
				type: 'subscription',
				effective_status: 'active',
				category: 'Streaming',
				provider: 'Netflix'
			},
			{
				id: 'item-2',
				name: 'GitHub',
				type: 'subscription',
				effective_status: 'active',
				category: 'Tools',
				provider: 'GitHub'
			},
			{
				id: 'item-3',
				name: 'OpenAI',
				type: 'subscription',
				effective_status: 'active',
				category: 'Tools',
				provider: 'OpenAI'
			}
		]);

		expect(getDistinctOptions(items)).toEqual({
			categories: ['Streaming', 'Tools'],
			providers: ['GitHub', 'Netflix', 'OpenAI']
		});
	});
});
