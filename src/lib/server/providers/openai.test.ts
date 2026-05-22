import { describe, expect, test } from 'vitest';

import { ProviderSyncError } from './errors';
import { fetchOpenAIMonthToDateCost, utcMonthWindow } from './openai';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('OpenAI provider adapter', () => {
	test('computes UTC month window', () => {
		expect(utcMonthWindow(new Date('2026-05-22T13:30:00.000Z'))).toEqual({
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23',
			startTime: 1777593600,
			endTime: 1779494400
		});
	});

	test('builds a month-to-date costs request and normalizes rows', async () => {
		const calls: string[] = [];
		const fixtureFetch = async (url: string | URL | Request) => {
			const requestUrl = String(url);
			calls.push(requestUrl);
			return jsonResponse({
				object: 'page',
				has_more: false,
				next_page: null,
				data: [
					{
						object: 'bucket',
						start_time: 1777593600,
						end_time: 1777680000,
						results: [
							{
								object: 'organization.costs.result',
								amount: { value: 1.25, currency: 'usd' },
								line_item: 'text',
								project_id: 'proj_text'
							},
							{
								object: 'organization.costs.result',
								amount: { value: 2.5, currency: 'usd' },
								line_item: 'image',
								project_id: 'proj_image'
							}
						]
					}
				]
			});
		};

		const result = await fetchOpenAIMonthToDateCost({
			adminKey: 'sk-admin-test',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(calls).toHaveLength(1);
		const url = new URL(calls[0]);
		expect(url.pathname).toBe('/v1/organization/costs');
		expect(url.searchParams.get('start_time')).toBe('1777593600');
		expect(url.searchParams.get('end_time')).toBe('1779494400');
		expect(url.searchParams.get('bucket_width')).toBe('1d');
		expect(url.searchParams.getAll('group_by')).toEqual(['project_id', 'line_item']);
		expect(result).toMatchObject({
			provider: 'openai',
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23',
			totalAmount: 3.75,
			currency: 'USD'
		});
		expect(result.lines).toEqual([
			expect.objectContaining({
				externalProjectId: 'proj_text',
				lineItem: 'text',
				amount: 1.25,
				currency: 'USD'
			}),
			expect.objectContaining({
				externalProjectId: 'proj_image',
				lineItem: 'image',
				amount: 2.5,
				currency: 'USD'
			})
		]);
		expect(JSON.stringify(result.rawSummary)).not.toContain('sk-admin-test');
	});

	test('follows cursor pagination', async () => {
		const pages = [
			jsonResponse({
				has_more: true,
				next_page: 'cursor-2',
				data: [{ start_time: 1, end_time: 2, results: [{ amount: { value: 1, currency: 'usd' } }] }]
			}),
			jsonResponse({
				has_more: false,
				next_page: null,
				data: [{ start_time: 2, end_time: 3, results: [{ amount: { value: 2, currency: 'usd' } }] }]
			})
		];
		const calls: string[] = [];
		const fixtureFetch = async (url: string | URL | Request) => {
			calls.push(String(url));
			return pages.shift() ?? jsonResponse({ has_more: false, data: [] });
		};

		const result = await fetchOpenAIMonthToDateCost({
			adminKey: 'sk-admin-test',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(result.totalAmount).toBe(3);
		expect(new URL(calls[1]).searchParams.get('page')).toBe('cursor-2');
	});

	test('passes project filters when configured', async () => {
		const calls: string[] = [];
		const fixtureFetch = async (url: string | URL | Request) => {
			calls.push(String(url));
			return jsonResponse({ has_more: false, next_page: null, data: [] });
		};

		await fetchOpenAIMonthToDateCost({
			adminKey: 'sk-admin-test',
			projectIds: ['proj_a', 'proj_b'],
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(new URL(calls[0]).searchParams.getAll('project_ids')).toEqual(['proj_a', 'proj_b']);
	});

	test('maps provider HTTP failures to safe errors', async () => {
		await expect(
			fetchOpenAIMonthToDateCost({
				adminKey: 'sk-admin-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => jsonResponse({ error: { message: 'bad key sk-admin-secret' } }, 401)
			})
		).rejects.toMatchObject({
			kind: 'unauthorized',
			status: 401,
			message: expect.not.stringContaining('sk-admin-secret')
		});
	});

	test('maps network and malformed JSON failures to provider errors', async () => {
		await expect(
			fetchOpenAIMonthToDateCost({
				adminKey: 'sk-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => {
					throw new TypeError('fetch failed');
				}
			})
		).rejects.toMatchObject({ kind: 'network' });

		await expect(
			fetchOpenAIMonthToDateCost({
				adminKey: 'sk-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => new Response('not json', { status: 200 })
			})
		).rejects.toMatchObject({ kind: 'bad_response' });
	});

	test('rejects unsupported and mixed currencies', async () => {
		await expect(
			fetchOpenAIMonthToDateCost({
				adminKey: 'sk-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({
						has_more: false,
						next_page: null,
						data: [{ results: [{ amount: { value: 1, currency: 'jpy' } }] }]
					})
			})
		).rejects.toMatchObject({ kind: 'unsupported_currency' });

		await expect(
			fetchOpenAIMonthToDateCost({
				adminKey: 'sk-admin-test',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({
						has_more: false,
						next_page: null,
						data: [
							{
								results: [
									{ amount: { value: 1, currency: 'usd' } },
									{ amount: { value: 1, currency: 'eur' } }
								]
							}
						]
					})
			})
		).rejects.toBeInstanceOf(ProviderSyncError);
	});
});
