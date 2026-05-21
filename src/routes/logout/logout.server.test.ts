import { describe, expect, test, vi } from 'vitest';
import { POST } from './+server';

describe('logout endpoint', () => {
	test('signs out the current session and redirects to login', async () => {
		const headers: Record<string, string> = {};
		const signOut = vi.fn().mockResolvedValue({ error: null });

		await expect(
			POST({
				locals: { supabase: { auth: { signOut } } },
				request: new Request('http://localhost/logout', {
					method: 'POST',
					headers: { origin: 'http://localhost' }
				}),
				setHeaders: (nextHeaders: Record<string, string>) => Object.assign(headers, nextHeaders),
				url: new URL('http://localhost/logout')
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});

		expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
		expect(headers['cache-control']).toBe('private, no-store, max-age=0');
	});

	test('surfaces sign-out failures', async () => {
		const signOut = vi.fn().mockResolvedValue({ error: new Error('auth offline') });

		await expect(
			POST({
				locals: { supabase: { auth: { signOut } } },
				request: new Request('http://localhost/logout', {
					method: 'POST',
					headers: { origin: 'http://localhost' }
				}),
				setHeaders: () => {},
				url: new URL('http://localhost/logout')
			} as never)
		).rejects.toMatchObject({
			status: 500,
			body: { message: 'Unable to sign out.' }
		});
	});

	test('rejects cross-origin POST requests before signing out', async () => {
		const signOut = vi.fn();

		await expect(
			POST({
				locals: { supabase: { auth: { signOut } } },
				request: new Request('http://localhost/logout', {
					method: 'POST',
					headers: { origin: 'https://evil.example' }
				}),
				setHeaders: () => {},
				url: new URL('http://localhost/logout')
			} as never)
		).rejects.toMatchObject({
			status: 403,
			body: { message: 'Cross-site logout requests are forbidden.' }
		});
		expect(signOut).not.toHaveBeenCalled();
	});
});
