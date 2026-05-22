import { describe, expect, test } from 'vitest';

import { ProviderSyncError } from './errors';
import { fetchOpenRouterMonthToDateCost, utcMonthWindow } from './openrouter';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function keyFixture(overrides: Record<string, unknown> = {}) {
	return {
		created_at: '2026-05-01T00:00:00Z',
		updated_at: '2026-05-22T10:00:00Z',
		hash: 'f01d52606dc8f0a8303a7b5cc3fa07109c2e346cec7c0a16b40de462992ce943',
		label: 'sk-or-v1-prod...123',
		name: 'Production key',
		disabled: false,
		limit: 100,
		limit_remaining: 74.5,
		limit_reset: 'monthly',
		include_byok_in_limit: false,
		usage: 25.5,
		usage_daily: 1.25,
		usage_weekly: 7.5,
		usage_monthly: 12.5,
		byok_usage: 0,
		byok_usage_daily: 0,
		byok_usage_weekly: 0,
		byok_usage_monthly: 0,
		workspace_id: '0df9e665-d932-5740-b2c7-b52af166bc11',
		expires_at: '2027-12-31T23:59:59Z',
		...overrides
	};
}

describe('OpenRouter provider adapter', () => {
	test('computes UTC month window', () => {
		expect(utcMonthWindow(new Date('2026-05-22T13:30:00.000Z'))).toEqual({
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23'
		});
	});

	test('lists management keys and normalizes monthly usage by key', async () => {
		const calls: { url: string; init: RequestInit | undefined }[] = [];
		const fixtureFetch = async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(url), init });
			return jsonResponse({
				data: [
					keyFixture(),
					keyFixture({
						hash: 'a3f5b7c9d8e1f23456789abcdef0123456789abcdef0123456789abcdef0123',
						label: 'sk-or-v1-dev...456',
						name: '',
						disabled: true,
						usage_monthly: '2.25',
						workspace_id: 'workspace_dev'
					})
				]
			});
		};

		const result = await fetchOpenRouterMonthToDateCost({
			adminKey: 'sk-or-v1-management-secret',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(calls).toHaveLength(1);
		const url = new URL(calls[0].url);
		expect(url.pathname).toBe('/api/v1/keys');
		expect(url.searchParams.get('include_disabled')).toBe('true');
		expect(url.searchParams.get('limit')).toBeNull();
		expect(url.searchParams.get('offset')).toBeNull();
		expect(calls[0].init?.headers).toMatchObject({
			authorization: 'Bearer sk-or-v1-management-secret',
			'content-type': 'application/json'
		});
		expect(result).toMatchObject({
			provider: 'openrouter',
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23',
			totalAmount: 14.75,
			currency: 'USD'
		});
		expect(result.lines).toEqual([
			expect.objectContaining({
				externalProjectId: '0df9e665-d932-5740-b2c7-b52af166bc11',
				externalApiKeyId: 'f01d52606dc8f0a8303a7b5cc3fa07109c2e346cec7c0a16b40de462992ce943',
				lineItem: 'Production key',
				amount: 12.5,
				currency: 'USD'
			}),
			expect.objectContaining({
				externalProjectId: 'workspace_dev',
				lineItem: 'sk-or-v1-dev...456',
				amount: 2.25,
				currency: 'USD'
			})
		]);
		expect(JSON.stringify(result.rawSummary)).not.toContain('sk-or-v1-management-secret');
		expect(JSON.stringify(result.lines[0].raw)).not.toContain('sk-or-v1-management-secret');
		expect(result.lines[1].raw).toMatchObject({ disabled: true });
	});

	test('paginates by offset until fewer than 100 keys are returned', async () => {
		const calls: string[] = [];
		const firstPage = Array.from({ length: 100 }, (_, index) =>
			keyFixture({
				hash: `hash_${index}`,
				label: `key ${index}`,
				name: `key ${index}`,
				usage_monthly: 1
			})
		);
		const pages = [jsonResponse({ data: firstPage }), jsonResponse({ data: [keyFixture()] })];
		const fixtureFetch = async (url: string | URL | Request) => {
			calls.push(String(url));
			return pages.shift() ?? jsonResponse({ data: [] });
		};

		const result = await fetchOpenRouterMonthToDateCost({
			adminKey: 'sk-or-v1-management-secret',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(result.lines).toHaveLength(101);
		expect(result.totalAmount).toBe(112.5);
		expect(new URL(calls[1]).searchParams.get('offset')).toBe('100');
	});

	test('reports the configured pagination safety limit', async () => {
		await expect(
			fetchOpenRouterMonthToDateCost({
				adminKey: 'sk-or-v1-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({
						data: Array.from({ length: 100 }, (_, index) =>
							keyFixture({ hash: `hash_${index}`, usage_monthly: 0 })
						)
					})
			})
		).rejects.toMatchObject({
			kind: 'bad_response',
			message: 'OpenRouter Management API key listing pagination exceeded safety limit of 20 pages.'
		});
	});

	test('rejects external project filters', async () => {
		await expect(
			fetchOpenRouterMonthToDateCost({
				adminKey: 'sk-or-v1-management-secret',
				projectIds: ['workspace_a'],
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => jsonResponse({ data: [] })
			})
		).rejects.toMatchObject({ kind: 'unsupported_filter' });
	});

	test('maps provider HTTP failures to safe errors', async () => {
		await expect(
			fetchOpenRouterMonthToDateCost({
				adminKey: 'sk-or-v1-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({ error: { message: 'bad key sk-or-v1-management-secret' } }, 401)
			})
		).rejects.toMatchObject({
			kind: 'unauthorized',
			status: 401,
			message: expect.not.stringContaining('sk-or-v1-management-secret')
		});
	});

	test('maps network and malformed JSON failures to provider errors', async () => {
		await expect(
			fetchOpenRouterMonthToDateCost({
				adminKey: 'sk-or-v1-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => {
					throw new TypeError('fetch failed sk-or-v1-management-secret');
				}
			})
		).rejects.toMatchObject({
			kind: 'network',
			message: expect.not.stringContaining('sk-or-v1-management-secret')
		});

		await expect(
			fetchOpenRouterMonthToDateCost({
				adminKey: 'sk-or-v1-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => new Response('not json', { status: 200 })
			})
		).rejects.toMatchObject({ kind: 'bad_response' });
	});

	test('rejects malformed key usage', async () => {
		await expect(
			fetchOpenRouterMonthToDateCost({
				adminKey: 'sk-or-v1-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => jsonResponse({ data: [keyFixture({ usage_monthly: 'not-a-number' })] })
			})
		).rejects.toBeInstanceOf(ProviderSyncError);
	});
});
