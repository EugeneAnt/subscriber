import { describe, expect, test } from 'vitest';
import { load } from './+layout.server';

describe('(app) layout server load', () => {
	test('returns a service-unavailable error when session validation fails unexpectedly', async () => {
		await expect(
			load({
				locals: {
					safeGetSession: async () => {
						throw new Error('auth offline');
					}
				},
				url: new URL('http://localhost/')
			} as never)
		).rejects.toMatchObject({
			status: 503,
			body: { message: 'Authentication service unavailable.' }
		});
	});
});
