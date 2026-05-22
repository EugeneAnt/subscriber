import { describe, expect, test } from 'vitest';

import { isTimestampFresh, shouldAutoRefreshProviderCost } from './provider-cost-freshness';

describe('provider cost freshness', () => {
	const now = new Date('2026-05-22T11:00:00.000Z');

	test('checks timestamp freshness against the configured cache window', () => {
		expect(isTimestampFresh('2026-05-22T10:30:00.000Z', 60, now)).toBe(true);
		expect(isTimestampFresh('2026-05-22T09:59:59.000Z', 60, now)).toBe(false);
		expect(isTimestampFresh(null, 60, now)).toBe(false);
		expect(isTimestampFresh('not-a-date', 60, now)).toBe(false);
	});

	test('auto-refreshes stale or missing snapshots', () => {
		expect(
			shouldAutoRefreshProviderCost(
				{
					latest_fetched_at: '2026-05-22T09:30:00.000Z',
					last_sync_finished_at: '2026-05-22T09:30:00.000Z'
				},
				60,
				now
			)
		).toBe(true);
		expect(shouldAutoRefreshProviderCost({ latest_fetched_at: null }, 60, now)).toBe(true);
	});

	test('does not auto-refresh fresh snapshots or recent failed attempts', () => {
		expect(
			shouldAutoRefreshProviderCost({ latest_fetched_at: '2026-05-22T10:30:00.000Z' }, 60, now)
		).toBe(false);
		expect(
			shouldAutoRefreshProviderCost(
				{
					latest_fetched_at: null,
					last_sync_finished_at: '2026-05-22T10:45:00.000Z'
				},
				60,
				now
			)
		).toBe(false);
	});
});
