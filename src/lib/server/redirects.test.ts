import { describe, expect, test } from 'vitest';
import { safeRedirectPath } from './redirects';

describe('safeRedirectPath', () => {
	test.each([
		['/items', '/items'],
		['/items?type=subscription', '/items?type=subscription'],
		['/items/new#form', '/items/new#form']
	])('allows same-origin redirect path %s', (input, expected) => {
		expect(safeRedirectPath(input)).toBe(expected);
	});

	test.each([
		null,
		'',
		'items',
		'https://example.com',
		'//example.com',
		'/\r\nset-cookie:evil=true',
		'/items name',
		'/\\example',
		'/items[1]',
		`/${'a'.repeat(2048)}`
	])('falls back for unsafe redirect target %s', (input) => {
		expect(safeRedirectPath(input)).toBe('/');
	});
});
