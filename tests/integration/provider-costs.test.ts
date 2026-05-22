import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	defaultProviderConnection,
	ensureConfiguredProviderConnections,
	listLatestProviderCostLines,
	listProviderConnections,
	refreshProviderCost,
	updateProviderBudget
} from '../../src/lib/server/provider-costs';
import { providerDefinition } from '../../src/lib/server/providers';
import type { ProviderCostFetchResult } from '../../src/lib/server/providers/types';
import { createTestUser, deleteTestUser, signedInClient } from './helpers/supabase';

let userId: string;
let email: string;
let client: Awaited<ReturnType<typeof signedInClient>>;

function fixtureCost(
	totalAmount = 12.5,
	provider: ProviderCostFetchResult['provider'] = 'openai'
): ProviderCostFetchResult {
	return {
		provider,
		periodStart: '2026-05-01',
		periodEndExclusive: '2026-05-23',
		totalAmount,
		currency: 'USD',
		providerObservedAt: null,
		lines: [
			{
				externalProjectId: 'proj_test',
				lineItem: 'text',
				amount: totalAmount,
				currency: 'USD',
				raw: { fixture: true }
			}
		],
		rawSummary: { fixture: true }
	};
}

describe('provider cost helpers', () => {
	beforeEach(async () => {
		email = `provider-${crypto.randomUUID()}@example.test`;
		const user = await createTestUser(email);
		userId = user.id;
		client = await signedInClient(email);
	});

	afterEach(async () => {
		await deleteTestUser(userId);
	});

	test('creates configured provider connections idempotently', async () => {
		await ensureConfiguredProviderConnections(client, userId, [
			providerDefinition('openai'),
			providerDefinition('anthropic'),
			providerDefinition('xai')
		]);
		await ensureConfiguredProviderConnections(client, userId, [
			providerDefinition('openai'),
			providerDefinition('anthropic'),
			providerDefinition('xai')
		]);

		const rows = await listProviderConnections(client);
		expect(rows).toHaveLength(3);
		expect(rows.map((row) => row.provider_code).sort()).toEqual(['anthropic', 'openai', 'xai']);
		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					provider_code: 'anthropic',
					display_name: 'Anthropic API',
					budget_status: 'unknown'
				}),
				expect.objectContaining({
					provider_code: 'openai',
					display_name: 'OpenAI API',
					budget_status: 'unknown'
				}),
				expect.objectContaining({
					provider_code: 'xai',
					display_name: 'xAI API',
					budget_status: 'unknown'
				})
			])
		);
	});

	test('updates budget settings', async () => {
		await ensureConfiguredProviderConnections(client, userId, [providerDefinition('openai')]);
		const [connection] = await listProviderConnections(client);

		await updateProviderBudget(client, connection.id, {
			monthly_budget: 25,
			warning_remaining_amount: 5,
			critical_remaining_amount: 1
		});

		const [updated] = await listProviderConnections(client);
		expect(Number(updated.monthly_budget)).toBe(25);
		expect(Number(updated.warning_remaining_amount)).toBe(5);
		expect(Number(updated.critical_remaining_amount)).toBe(1);
	});

	test('view shows latest snapshot and line rows are RLS scoped', async () => {
		await ensureConfiguredProviderConnections(client, userId, [providerDefinition('openai')]);
		const [connection] = await listProviderConnections(client);

		const { data: snapshot, error: snapshotError } = await client
			.from('provider_cost_snapshots')
			.insert({
				user_id: userId,
				provider_connection_id: connection.id,
				period_start: '2026-05-01',
				period_end_exclusive: '2026-05-23',
				total_amount: 12.5,
				currency: 'USD',
				raw_summary: { fixture: true }
			})
			.select('id')
			.single();

		expect(snapshotError).toBeNull();
		expect(snapshot?.id).toBeTruthy();

		const { error: lineError } = await client.from('provider_cost_snapshot_lines').insert({
			user_id: userId,
			snapshot_id: snapshot!.id,
			external_project_id: 'proj_test',
			line_item: 'text',
			amount: 12.5,
			currency: 'USD',
			raw_line: { fixture: true }
		});

		expect(lineError).toBeNull();

		const [updated] = await listProviderConnections(client);
		expect(updated.current_period_spend).toBe(12.5);
		expect(updated.current_period_currency).toBe('USD');

		const linesByConnection = await listLatestProviderCostLines(client, [connection.id]);
		expect(linesByConnection[connection.id]).toEqual([
			expect.objectContaining({
				external_project_id: 'proj_test',
				line_item: 'text',
				amount: 12.5,
				currency: 'USD'
			})
		]);
	});

	test('refresh persists a sanitized snapshot and deduplicates repeated identical results', async () => {
		await ensureConfiguredProviderConnections(client, userId, [providerDefinition('openai')]);
		const [connection] = await listProviderConnections(client);

		const resolveCredential = () => 'sk-test-provider-costs';

		await refreshProviderCost(client, userId, connection.id, {
			now: new Date('2026-05-22T10:00:00.000Z'),
			fetchMonthToDateCost: async ({ adminKey }) => {
				expect(adminKey).toBe('sk-test-provider-costs');
				return fixtureCost(12.5);
			},
			resolveCredential
		});
		await refreshProviderCost(client, userId, connection.id, {
			now: new Date('2026-05-22T10:01:00.000Z'),
			fetchMonthToDateCost: async () => fixtureCost(12.5),
			resolveCredential
		});

		const { data: snapshots, error: snapshotError } = await client
			.from('provider_cost_snapshots')
			.select('id, raw_summary')
			.eq('provider_connection_id', connection.id);

		expect(snapshotError).toBeNull();
		expect(snapshots).toHaveLength(1);
		expect(JSON.stringify(snapshots?.[0]?.raw_summary)).not.toContain('sk-');

		const { data: lines, error: lineError } = await client
			.from('provider_cost_snapshot_lines')
			.select('line_item, amount')
			.eq('snapshot_id', snapshots![0].id);

		expect(lineError).toBeNull();
		expect(lines).toEqual([{ line_item: 'text', amount: 12.5 }]);
	});

	test('refresh supports an injected Anthropic fixture', async () => {
		await ensureConfiguredProviderConnections(client, userId, [providerDefinition('anthropic')]);
		const [connection] = await listProviderConnections(client);

		await refreshProviderCost(client, userId, connection.id, {
			now: new Date('2026-05-22T10:00:00.000Z'),
			fetchMonthToDateCost: async ({ adminKey }) => {
				expect(adminKey).toBe('sk-ant-admin-provider-costs');
				return fixtureCost(3.5, 'anthropic');
			},
			resolveCredential: () => 'sk-ant-admin-provider-costs'
		});

		const [updated] = await listProviderConnections(client);
		expect(updated).toMatchObject({
			provider_code: 'anthropic',
			current_period_spend: 3.5,
			current_period_currency: 'USD'
		});

		const linesByConnection = await listLatestProviderCostLines(client, [connection.id]);
		expect(linesByConnection[connection.id]).toEqual([
			expect.objectContaining({
				amount: 3.5,
				currency: 'USD'
			})
		]);
	});

	test('refresh supports an injected xAI fixture', async () => {
		await ensureConfiguredProviderConnections(client, userId, [providerDefinition('xai')]);
		const [connection] = await listProviderConnections(client);

		await refreshProviderCost(client, userId, connection.id, {
			now: new Date('2026-05-22T10:00:00.000Z'),
			fetchMonthToDateCost: async ({ adminKey }) => {
				expect(adminKey).toBe('xai-management-provider-costs');
				return fixtureCost(4.25, 'xai');
			},
			resolveCredential: () => 'xai-management-provider-costs'
		});

		const [updated] = await listProviderConnections(client);
		expect(updated).toMatchObject({
			provider_code: 'xai',
			current_period_spend: 4.25,
			current_period_currency: 'USD'
		});

		const linesByConnection = await listLatestProviderCostLines(client, [connection.id]);
		expect(linesByConnection[connection.id]).toEqual([
			expect.objectContaining({
				amount: 4.25,
				currency: 'USD'
			})
		]);
	});

	test('RLS blocks another user from writing this user id', async () => {
		await expect(
			client.from('provider_connections').insert({
				...defaultProviderConnection(
					'00000000-0000-0000-0000-000000000999',
					providerDefinition('openai')
				),
				display_name: 'Wrong user'
			})
		).resolves.toMatchObject({ error: expect.objectContaining({ code: '42501' }) });
	});
});
