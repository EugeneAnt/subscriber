import { describe, expect, test } from 'vitest';

import { ProviderSyncError } from './errors';
import { fetchXaiMonthToDateCost, utcMonthWindow } from './xai';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function validationFixture(overrides: Record<string, unknown> = {}) {
	return {
		apiKeyId: 'key_123',
		teamId: 'team_deprecated',
		scope: 'SCOPE_TEAM',
		scopeId: 'team_123',
		name: 'Subscriber xAI key',
		redactedApiKey: 'xai-...test',
		...overrides
	};
}

describe('xAI provider adapter', () => {
	test('computes UTC month window using xAI timestamp format', () => {
		expect(utcMonthWindow(new Date('2026-05-22T13:30:00.000Z'))).toEqual({
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23',
			startTime: '2026-05-01 00:00:00',
			endTime: '2026-05-22 23:59:59'
		});
	});

	test('validates the management key, builds a usage request, and normalizes usage series', async () => {
		const calls: { url: string; init: RequestInit | undefined }[] = [];
		const fixtureFetch = async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(url), init });

			if (String(url).endsWith('/auth/management-keys/validation')) {
				return jsonResponse(validationFixture());
			}

			return jsonResponse({
				timeSeries: [
					{
						group: ['Chat grok-4-0709'],
						groupLabels: ['Chat grok-4-0709'],
						dataPoints: [
							{ timestamp: '2026-05-01T00:00:00Z', values: [0.75] },
							{ timestamp: '2026-05-02T00:00:00Z', values: ['0.25'] }
						]
					},
					{
						group: ['grok-2-image-1212'],
						groupLabels: ['grok-2-image-1212'],
						dataPoints: [{ timestamp: '2026-05-03T00:00:00Z', values: [0.14] }]
					}
				],
				limitReached: false
			});
		};

		const result = await fetchXaiMonthToDateCost({
			adminKey: 'xai-management-secret',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(calls).toHaveLength(2);
		expect(new URL(calls[0].url).pathname).toBe('/auth/management-keys/validation');
		expect(calls[0].init?.headers).toMatchObject({
			authorization: 'Bearer xai-management-secret'
		});

		const usageUrl = new URL(calls[1].url);
		expect(usageUrl.pathname).toBe('/v1/billing/teams/team_123/usage');
		expect(calls[1].init?.method).toBe('POST');
		expect(calls[1].init?.headers).toMatchObject({
			authorization: 'Bearer xai-management-secret',
			'content-type': 'application/json'
		});
		expect(JSON.parse(String(calls[1].init?.body))).toEqual({
			analyticsRequest: {
				timeRange: {
					startTime: '2026-05-01 00:00:00',
					endTime: '2026-05-22 23:59:59',
					timezone: 'Etc/GMT'
				},
				timeUnit: 'TIME_UNIT_DAY',
				values: [{ name: 'usd', aggregation: 'AGGREGATION_SUM' }],
				groupBy: ['description'],
				filters: []
			}
		});
		expect(result).toMatchObject({
			provider: 'xai',
			periodStart: '2026-05-01',
			periodEndExclusive: '2026-05-23',
			currency: 'USD'
		});
		expect(result.totalAmount).toBeCloseTo(1.14);
		expect(result.lines).toEqual([
			expect.objectContaining({
				lineItem: 'Chat grok-4-0709',
				amount: 1,
				currency: 'USD'
			}),
			expect.objectContaining({
				lineItem: 'grok-2-image-1212',
				amount: 0.14,
				currency: 'USD'
			})
		]);
		expect(JSON.stringify(result.rawSummary)).not.toContain('xai-management-secret');
		expect(JSON.stringify(result.lines[0].raw)).not.toContain('xai-management-secret');
	});

	test('falls back to deprecated teamId when scope is absent', async () => {
		const calls: string[] = [];
		const fixtureFetch = async (url: string | URL | Request) => {
			calls.push(String(url));
			if (String(url).endsWith('/auth/management-keys/validation')) {
				return jsonResponse(validationFixture({ scope: undefined, scopeId: undefined }));
			}

			return jsonResponse({ timeSeries: [], limitReached: false });
		};

		await fetchXaiMonthToDateCost({
			adminKey: 'xai-management-secret',
			now: new Date('2026-05-22T13:30:00.000Z'),
			fetch: fixtureFetch
		});

		expect(new URL(calls[1]).pathname).toBe('/v1/billing/teams/team_deprecated/usage');
	});

	test('rejects non-team management keys and external project filters', async () => {
		await expect(
			fetchXaiMonthToDateCost({
				adminKey: 'xai-management-secret',
				projectIds: ['project_a'],
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => jsonResponse({ timeSeries: [], limitReached: false })
			})
		).rejects.toMatchObject({ kind: 'unsupported_filter' });

		await expect(
			fetchXaiMonthToDateCost({
				adminKey: 'xai-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse(validationFixture({ scope: 'SCOPE_ORGANIZATION', scopeId: 'org_123' }))
			})
		).rejects.toMatchObject({
			kind: 'bad_response',
			message: expect.stringContaining('team-scoped')
		});
	});

	test('maps provider HTTP failures to safe errors', async () => {
		await expect(
			fetchXaiMonthToDateCost({
				adminKey: 'xai-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () =>
					jsonResponse({ error: { message: 'bad key xai-management-secret' } }, 401)
			})
		).rejects.toMatchObject({
			kind: 'unauthorized',
			status: 401,
			message: expect.not.stringContaining('xai-management-secret')
		});
	});

	test('maps network and malformed JSON failures to provider errors', async () => {
		await expect(
			fetchXaiMonthToDateCost({
				adminKey: 'xai-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => {
					throw new TypeError('fetch failed xai-management-secret');
				}
			})
		).rejects.toMatchObject({
			kind: 'network',
			message: expect.not.stringContaining('xai-management-secret')
		});

		await expect(
			fetchXaiMonthToDateCost({
				adminKey: 'xai-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async () => new Response('not json', { status: 200 })
			})
		).rejects.toMatchObject({ kind: 'bad_response' });
	});

	test('rejects partial and malformed usage responses', async () => {
		await expect(
			fetchXaiMonthToDateCost({
				adminKey: 'xai-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async (url) =>
					String(url).endsWith('/auth/management-keys/validation')
						? jsonResponse(validationFixture())
						: jsonResponse({ timeSeries: [], limitReached: true })
			})
		).rejects.toMatchObject({ kind: 'bad_response' });

		await expect(
			fetchXaiMonthToDateCost({
				adminKey: 'xai-management-secret',
				now: new Date('2026-05-22T13:30:00.000Z'),
				fetch: async (url) =>
					String(url).endsWith('/auth/management-keys/validation')
						? jsonResponse(validationFixture())
						: jsonResponse({
								timeSeries: [{ dataPoints: [{ values: ['not-a-number'] }] }],
								limitReached: false
							})
			})
		).rejects.toBeInstanceOf(ProviderSyncError);
	});
});
