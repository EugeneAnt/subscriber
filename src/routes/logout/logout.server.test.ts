import { describe, expect, test, vi } from 'vitest';
import { POST } from './+server';

describe('logout endpoint', () => {
	test('rejects cross-origin POST requests before signing out', async () => {
		const signOut = vi.fn();

		await expect(
			POST({
				locals: { supabase: { auth: { signOut } } },
				request: new Request('http://localhost/logout', {
					method: 'POST',
					headers: { origin: 'https://evil.example' }
				}),
				url: new URL('http://localhost/logout')
			} as never)
		).rejects.toMatchObject({
			status: 403,
			body: { message: 'Cross-site logout requests are forbidden.' }
		});
		expect(signOut).not.toHaveBeenCalled();
	});
});
