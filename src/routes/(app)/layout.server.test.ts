import { describe, expect, test } from 'vitest';
import { load } from './+layout.server';

describe('(app) layout server load', () => {
	test('marks protected pages as non-cacheable', async () => {
		const headers: Record<string, string> = {};

		await load({
			locals: {
				safeGetSession: async () => ({
					session: null,
					user: { id: 'user-id', email: 'user@example.com' }
				})
			},
			setHeaders: (nextHeaders: Record<string, string>) => Object.assign(headers, nextHeaders),
			url: new URL('http://localhost/')
		} as never);

		expect(headers['cache-control']).toBe('private, no-store, max-age=0');
	});

	test('returns a service-unavailable error when session validation fails unexpectedly', async () => {
		const headers: Record<string, string> = {};

		await expect(
			load({
				locals: {
					safeGetSession: async () => {
						throw new Error('auth offline');
					}
				},
				setHeaders: (nextHeaders: Record<string, string>) => Object.assign(headers, nextHeaders),
				url: new URL('http://localhost/')
			} as never)
		).rejects.toMatchObject({
			status: 503,
			body: { message: 'Authentication service unavailable.' }
		});
		expect(headers['cache-control']).toBe('private, no-store, max-age=0');
	});
});
