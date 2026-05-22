import { describe, expect, test } from 'vitest';

import {
	cacheMinutesFromEnv,
	isSnapshotFresh,
	normalizeBudgetInput,
	toProviderConnectionCard
} from './provider-costs';
import {
	configuredProviderDefinitions,
	credentialNameForProvider,
	resolveServerEnvCredential
} from './providers';
import type { Database } from '$lib/types/database';

type ProviderConnectionViewRow = Database['public']['Views']['provider_connections_v']['Row'];
type RuntimeProviderConnectionViewRow = Omit<
	ProviderConnectionViewRow,
	| 'monthly_budget'
	| 'warning_remaining_amount'
	| 'critical_remaining_amount'
	| 'current_period_spend'
	| 'remaining_budget'
> & {
	monthly_budget: string;
	warning_remaining_amount: string;
	critical_remaining_amount: string;
	current_period_spend: string;
	remaining_budget: string;
};

describe('provider cost helpers', () => {
	test('resolves configured provider credentials from explicit env maps', () => {
		expect(credentialNameForProvider('openai')).toBe('OPENAI_ADMIN_KEY');
		expect(credentialNameForProvider('anthropic')).toBe('ANTHROPIC_ADMIN_KEY');
		expect(
			configuredProviderDefinitions({
				OPENAI_ADMIN_KEY: ' sk-admin-test ',
				ANTHROPIC_ADMIN_KEY: ''
			}).map((provider) => provider.code)
		).toEqual(['openai']);
		expect(
			configuredProviderDefinitions({
				OPENAI_ADMIN_KEY: '',
				ANTHROPIC_ADMIN_KEY: ' sk-ant-admin-test '
			}).map((provider) => provider.code)
		).toEqual(['anthropic']);
		expect(
			resolveServerEnvCredential('anthropic', 'ANTHROPIC_ADMIN_KEY', {
				ANTHROPIC_ADMIN_KEY: ' sk-ant-admin-test '
			})
		).toBe('sk-ant-admin-test');
		expect(
			resolveServerEnvCredential('anthropic', 'OPENAI_ADMIN_KEY', {
				OPENAI_ADMIN_KEY: 'sk-admin-test'
			})
		).toBeNull();
	});

	test('parses cache minutes with a safe default', () => {
		expect(cacheMinutesFromEnv(undefined)).toBe(60);
		expect(cacheMinutesFromEnv('15')).toBe(15);
		expect(cacheMinutesFromEnv('0')).toBe(60);
		expect(cacheMinutesFromEnv('not-number')).toBe(60);
	});

	test('checks snapshot freshness', () => {
		expect(
			isSnapshotFresh('2026-05-22T10:00:00.000Z', 60, new Date('2026-05-22T10:59:59.000Z'))
		).toBe(true);
		expect(
			isSnapshotFresh('2026-05-22T10:00:00.000Z', 60, new Date('2026-05-22T11:00:01.000Z'))
		).toBe(false);
		expect(isSnapshotFresh(null, 60, new Date('2026-05-22T11:00:01.000Z'))).toBe(false);
	});

	test('normalizes budget form inputs', () => {
		expect(
			normalizeBudgetInput({
				monthly_budget: '100',
				warning_remaining_amount: '5',
				critical_remaining_amount: '1'
			})
		).toEqual({
			monthly_budget: 100,
			warning_remaining_amount: 5,
			critical_remaining_amount: 1
		});
		expect(
			normalizeBudgetInput({
				monthly_budget: '',
				warning_remaining_amount: '',
				critical_remaining_amount: ''
			})
		).toEqual({
			monthly_budget: null,
			warning_remaining_amount: null,
			critical_remaining_amount: null
		});
		expect(() =>
			normalizeBudgetInput({
				monthly_budget: '10',
				warning_remaining_amount: '1',
				critical_remaining_amount: '5'
			})
		).toThrow('Warning threshold must be greater than or equal to critical threshold.');
	});

	test('normalizes provider view rows for UI', () => {
		expect(
			toProviderConnectionCard({
				id: 'connection-1',
				provider_code: 'anthropic',
				display_name: 'Anthropic API',
				status: 'active',
				credential_source: 'server_env',
				credential_name: 'ANTHROPIC_ADMIN_KEY',
				currency: 'USD',
				monthly_budget: '25.00',
				warning_remaining_amount: '5.00',
				critical_remaining_amount: '1.00',
				current_period_spend: '12.500000',
				current_period_currency: 'USD',
				remaining_budget: '12.500000',
				budget_status: 'healthy',
				latest_fetched_at: '2026-05-22T10:00:00.000Z',
				last_sync_status: 'success'
			} satisfies Partial<RuntimeProviderConnectionViewRow>)
		).toEqual(
			expect.objectContaining({
				id: 'connection-1',
				provider_code: 'anthropic',
				display_name: 'Anthropic API',
				current_period_spend: 12.5,
				remaining_budget: 12.5,
				budget_status: 'healthy'
			})
		);
	});
});
