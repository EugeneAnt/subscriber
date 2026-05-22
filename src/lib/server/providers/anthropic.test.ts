import { describe, expect, test } from 'vitest';

import { ProviderSyncError } from './errors';
import { fetchAnthropicMonthToDateCost, utcMonthWindow } from './anthropic';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('Anthropic provider adapter', () => {
	test('computes UTC month window', () => {
		expect(utcMonthWindow(new Date('2026-05-22T13:30:00.000Z'))).toEqual({
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23',
			startingAt: '2026-05-01T00:00:00.000Z',
			endingAt: '2026-05-23T00:00:00.000Z'
		});
	});

	test('builds a cost report request and normalizes cents to dollars', async () => {
		const calls: { url: string; headers: HeadersInit | undefined }[] = [];
		const fixtureFetch = async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(url), headers: init?.headers });
			return jsonResponse({
				has_more: false,
				next_page: null,
				data: [
					{
						starting_at: '2026-05-01T00:00:00Z',
						ending_at: '2026-05-02T00:00:00Z',
						results: [
							{
								amount: '123.45',
								currency: 'USD',
								workspace_id: 'wrkspc_default',
								description: 'Claude Sonnet 4 Usage - Input Tokens',
								cost_type: 'tokens',
								model: 'claude-sonnet-4-20250514'
							}
						]
					}
				]
			});
		};

		const result = await fetchAnthropicMonthToDateCost({
			adminKey: 'sk-ant-admin-test',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(calls).toHaveLength(1);
		const url = new URL(calls[0].url);
		expect(url.pathname).toBe('/v1/organizations/cost_report');
		expect(url.searchParams.get('starting_at')).toBe('2026-05-01T00:00:00.000Z');
		expect(url.searchParams.get('ending_at')).toBe('2026-05-23T00:00:00.000Z');
		expect(url.searchParams.get('bucket_width')).toBe('1d');
		expect(url.searchParams.getAll('group_by[]')).toEqual(['workspace_id', 'description']);
		expect(calls[0].headers).toMatchObject({
			'anthropic-version': '2023-06-01',
			'x-api-key': 'sk-ant-admin-test'
		});
		expect(result).toMatchObject({
			provider: 'anthropic',
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23',
			totalAmount: 1.2345,
			currency: 'USD'
		});
		expect(result.lines).toEqual([
			expect.objectContaining({
				externalProjectId: 'wrkspc_default',
				externalApiKeyId: null,
				lineItem: 'Claude Sonnet 4 Usage - Input Tokens',
				amount: 1.2345,
				currency: 'USD'
			})
		]);
		expect(JSON.stringify(result.rawSummary)).not.toContain('sk-ant-admin-test');
		expect(JSON.stringify(result.lines[0].raw)).not.toContain('sk-ant-admin-test');
	});

	test('follows cursor pagination', async () => {
		const pages = [
			jsonResponse({
				has_more: true,
				next_page: 'cursor-2',
				data: [{ results: [{ amount: '100', currency: 'USD' }] }]
			}),
			jsonResponse({
				has_more: false,
				next_page: null,
				data: [{ results: [{ amount: '250', currency: 'USD' }] }]
			})
		];
		const calls: string[] = [];
		const fixtureFetch = async (url: string | URL | Request) => {
			calls.push(String(url));
			return pages.shift() ?? jsonResponse({ has_more: false, data: [] });
		};

		const result = await fetchAnthropicMonthToDateCost({
			adminKey: 'sk-ant-admin-test',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(result.totalAmount).toBe(3.5);
		expect(new URL(calls[1]).searchParams.get('page')).toBe('cursor-2');
	});

	test('rejects external project filters because the cost endpoint only groups by workspace', async () => {
		await expect(
			fetchAnthropicMonthToDateCost({
				adminKey: 'sk-ant-admin-test',
				projectIds: ['wrkspc_123'],
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => jsonResponse({ has_more: false, next_page: null, data: [] })
			})
		).rejects.toMatchObject({
			kind: 'unsupported_filter',
			message: expect.stringContaining('does not support external project/workspace filters')
		});
	});

	test('maps provider HTTP failures to safe errors', async () => {
		await expect(
			fetchAnthropicMonthToDateCost({
				adminKey: 'sk-ant-admin-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => jsonResponse({ error: { message: 'bad key sk-ant-admin-secret' } }, 401)
			})
		).rejects.toMatchObject({
			kind: 'unauthorized',
			status: 401,
			message: expect.not.stringContaining('sk-ant-admin-secret')
		});
	});

	test('maps network and malformed JSON failures to provider errors', async () => {
		await expect(
			fetchAnthropicMonthToDateCost({
				adminKey: 'sk-ant-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => {
					throw new TypeError('fetch failed');
				}
			})
		).rejects.toMatchObject({ kind: 'network' });

		await expect(
			fetchAnthropicMonthToDateCost({
				adminKey: 'sk-ant-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => new Response('not json', { status: 200 })
			})
		).rejects.toMatchObject({ kind: 'bad_response' });
	});

	test('rejects malformed amounts and unsupported currencies', async () => {
		await expect(
			fetchAnthropicMonthToDateCost({
				adminKey: 'sk-ant-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({
						has_more: false,
						next_page: null,
						data: [{ results: [{ amount: 'not-a-number', currency: 'USD' }] }]
					})
			})
		).rejects.toMatchObject({ kind: 'bad_response' });

		await expect(
			fetchAnthropicMonthToDateCost({
				adminKey: 'sk-ant-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({
						has_more: false,
						next_page: null,
						data: [{ results: [{ amount: '100', currency: 'EUR' }] }]
					})
			})
		).rejects.toMatchObject({ kind: 'unsupported_currency' });

		await expect(
			fetchAnthropicMonthToDateCost({
				adminKey: 'sk-ant-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({
						has_more: false,
						next_page: null,
						data: [
							{
								results: [
									{ amount: '100', currency: 'USD' },
									{ amount: '100', currency: 'EUR' }
								]
							}
						]
					})
			})
		).rejects.toBeInstanceOf(ProviderSyncError);
	});
});
