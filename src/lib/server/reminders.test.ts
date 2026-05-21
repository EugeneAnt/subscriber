import { describe, expect, test } from 'vitest';

import { parseReminderKey, tomorrowUtcIso } from './reminders';

describe('parseReminderKey', () => {
	test('accepts the Phase 2 billing reminder natural key', () => {
		const form = new FormData();
		form.set('tracked_item_id', '10000000-0000-4000-8000-000000000001');
		form.set('event_kind', 'billing');
		form.set('event_date', '2026-06-01');
		form.set('lead_days', '7');

		expect(parseReminderKey(form)).toEqual({
			tracked_item_id: '10000000-0000-4000-8000-000000000001',
			event_kind: 'billing',
			event_date: '2026-06-01',
			lead_days: 7
		});
	});

	test.each([
		['bad uuid', 'not-a-uuid', 'billing', '2026-06-01', '7'],
		['expiry event kind', '10000000-0000-4000-8000-000000000001', 'expiry', '2026-06-01', '7'],
		['bad date', '10000000-0000-4000-8000-000000000001', 'billing', '2026-99-01', '7'],
		['unsupported lead days', '10000000-0000-4000-8000-000000000001', 'billing', '2026-06-01', '30']
	])('rejects %s', (_name, id, eventKind, eventDate, leadDays) => {
		const form = new FormData();
		form.set('tracked_item_id', id);
		form.set('event_kind', eventKind);
		form.set('event_date', eventDate);
		form.set('lead_days', leadDays);

		expect(() => parseReminderKey(form)).toThrow('Invalid reminder key');
	});
});

describe('tomorrowUtcIso', () => {
	test('returns the next UTC date string', () => {
		expect(tomorrowUtcIso(new Date('2026-05-21T23:59:00.000Z'))).toBe('2026-05-22');
	});
});
