import { describe, expect, test } from 'vitest';

import { formatEventTimingLabel } from './date-labels';

describe('date labels', () => {
	test('formats billing event timing relative to today', () => {
		expect(formatEventTimingLabel('billing', '2026-05-22', '2026-05-22')).toBe('Due today');
		expect(formatEventTimingLabel('billing', '2026-05-23', '2026-05-22')).toBe('Due in 1 day');
		expect(formatEventTimingLabel('billing', '2026-05-25', '2026-05-22')).toBe('Due in 3 days');
	});

	test('formats expiry event timing with expiry copy', () => {
		expect(formatEventTimingLabel('expiry', '2026-05-22', '2026-05-22')).toBe('Expires today');
		expect(formatEventTimingLabel('expiry', '2026-06-01', '2026-05-22')).toBe('Expires in 10 days');
	});

	test('keeps defensive copy for past dates', () => {
		expect(formatEventTimingLabel('billing', '2026-05-20', '2026-05-22')).toBe('Due 2 days ago');
	});
});
