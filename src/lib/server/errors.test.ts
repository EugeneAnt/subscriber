import { AuthError } from '@supabase/supabase-js';
import { describe, expect, test } from 'vitest';

import { classifyError } from './errors';

describe('classifyError', () => {
	test.each([
		['23502', 'not-null violation'],
		['23503', 'foreign-key violation'],
		['23505', 'unique violation'],
		['23514', 'check violation']
	])('maps Postgres %s (%s) to constraint', (code) => {
		expect(classifyError({ code })).toBe('constraint');
	});

	test('maps insufficient privilege to rls', () => {
		expect(classifyError({ code: '42501' })).toBe('rls');
	});

	test('maps singular-response errors to not_found', () => {
		expect(classifyError({ code: 'PGRST116' })).toBe('not_found');
	});

	test.each([
		['PGRST000', 'database connection string / service unavailable'],
		['PGRST001', 'internal database connection error'],
		['PGRST002', 'schema cache database connection error'],
		['PGRST003', 'database pool timeout'],
		['08006', 'Postgres connection failure']
	])('maps connection error %s (%s) to network', (code) => {
		expect(classifyError({ code })).toBe('network');
	});

	test('maps Supabase auth errors to auth', () => {
		expect(classifyError(new AuthError('Session missing', 401, 'session_not_found'))).toBe('auth');
	});

	test.each([
		new TypeError('fetch failed'),
		new TypeError('Failed to fetch'),
		Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:54321'), { code: 'ECONNREFUSED' })
	])('maps network-like runtime error to network', (error) => {
		expect(classifyError(error)).toBe('network');
	});

	test.each([{ code: 'XX999' }, { code: 23514 }, new Error('plain error'), null, undefined])(
		'maps unknown error %o to unexpected',
		(error) => {
			expect(classifyError(error)).toBe('unexpected');
		}
	);
});
