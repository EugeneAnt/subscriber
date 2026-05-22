import type { SupabaseClient } from '@supabase/supabase-js';

import { env as privateEnv } from '$env/dynamic/private';
import type { Database } from '$lib/types/database';

import {
	configuredProviderDefinitions,
	isProviderCode,
	providerDefinition,
	resolveServerEnvCredential
} from './providers';
import { ProviderSyncError, safeProviderErrorMessage } from './providers/errors';
import type {
	ProviderCode,
	ProviderCostFetchResult,
	ProviderCostFetcher,
	ProviderDefinition
} from './providers/types';

type Client = Pick<SupabaseClient<Database>, 'from'>;
type ProviderConnectionInsert = Database['public']['Tables']['provider_connections']['Insert'];
type ProviderConnectionUpdate = Database['public']['Tables']['provider_connections']['Update'];
type ProviderCostSnapshotInsert = Database['public']['Tables']['provider_cost_snapshots']['Insert'];
type ProviderCostSnapshotLineInsert =
	Database['public']['Tables']['provider_cost_snapshot_lines']['Insert'];
type ProviderCostSnapshotLineRow =
	Database['public']['Tables']['provider_cost_snapshot_lines']['Row'];
type ProviderConnectionViewRow = Database['public']['Views']['provider_connections_v']['Row'];
type ProviderConnectionViewInput = Omit<
	Partial<ProviderConnectionViewRow>,
	| 'monthly_budget'
	| 'warning_remaining_amount'
	| 'critical_remaining_amount'
	| 'current_period_spend'
	| 'remaining_budget'
> & {
	monthly_budget?: unknown;
	warning_remaining_amount?: unknown;
	critical_remaining_amount?: unknown;
	current_period_spend?: unknown;
	remaining_budget?: unknown;
};

export type ProviderBudgetPatch = Pick<
	ProviderConnectionUpdate,
	'monthly_budget' | 'warning_remaining_amount' | 'critical_remaining_amount'
>;

export type ProviderConnectionCard = ProviderConnectionViewRow & {
	id: string;
	provider_code: ProviderCode;
	display_name: string;
	budget_status: 'unknown' | 'healthy' | 'warning' | 'critical' | 'over_budget' | 'sync_error';
	current_period_spend: number | null;
	remaining_budget: number | null;
};

type ServerEnvCredentialResolver = (
	providerCode: ProviderCode,
	credentialName: string
) => string | null;

type RefreshProviderCostOptions = {
	now?: Date;
	fetchMonthToDateCost?: ProviderCostFetcher;
	resolveCredential?: ServerEnvCredentialResolver;
};

function parseNumeric(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value !== 'string' || value.trim() === '') {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function nullableNumber(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === '') return null;

	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error('Budget values must be non-negative numbers.');
	}

	return parsed;
}

export function cacheMinutesFromEnv(value = privateEnv.PROVIDER_COST_CACHE_MINUTES): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

export function isSnapshotFresh(
	latestFetchedAt: string | null,
	cacheMinutes: number,
	now = new Date()
): boolean {
	if (!latestFetchedAt) return false;

	const fetched = new Date(latestFetchedAt).getTime();
	if (Number.isNaN(fetched)) return false;

	return now.getTime() - fetched < cacheMinutes * 60_000;
}

export function normalizeBudgetInput(input: {
	monthly_budget: string;
	warning_remaining_amount: string;
	critical_remaining_amount: string;
}): ProviderBudgetPatch {
	const monthly_budget = nullableNumber(input.monthly_budget);
	const warning_remaining_amount = nullableNumber(input.warning_remaining_amount);
	const critical_remaining_amount = nullableNumber(input.critical_remaining_amount);

	if (
		warning_remaining_amount !== null &&
		critical_remaining_amount !== null &&
		warning_remaining_amount < critical_remaining_amount
	) {
		throw new Error('Warning threshold must be greater than or equal to critical threshold.');
	}

	return { monthly_budget, warning_remaining_amount, critical_remaining_amount };
}

export function toProviderConnectionCard(
	row: ProviderConnectionViewInput
): ProviderConnectionCard | null {
	const spend = parseNumeric(row.current_period_spend);
	const remaining = parseNumeric(row.remaining_budget);
	const status = row.budget_status;

	if (
		typeof row.id !== 'string' ||
		typeof row.provider_code !== 'string' ||
		!isProviderCode(row.provider_code) ||
		typeof row.display_name !== 'string' ||
		!(
			status === 'unknown' ||
			status === 'healthy' ||
			status === 'warning' ||
			status === 'critical' ||
			status === 'over_budget' ||
			status === 'sync_error'
		)
	) {
		return null;
	}

	return {
		...row,
		id: row.id,
		provider_code: row.provider_code,
		display_name: row.display_name,
		budget_status: status,
		current_period_spend: spend,
		remaining_budget: remaining
	} as ProviderConnectionCard;
}

export function defaultProviderConnection(
	userId: string,
	definition: ProviderDefinition
): ProviderConnectionInsert {
	return {
		user_id: userId,
		provider_code: definition.code,
		display_name: definition.connectionDisplayName,
		credential_source: 'server_env',
		credential_name: definition.credentialName,
		currency: definition.defaultCurrency,
		warning_remaining_amount: definition.defaultWarningRemainingAmount,
		critical_remaining_amount: definition.defaultCriticalRemainingAmount
	};
}

export function isAnyProviderCostSyncConfigured(): boolean {
	return configuredProviderDefinitions().length > 0;
}

export async function ensureProviderConnection(
	supabase: Client,
	userId: string,
	definition: ProviderDefinition
): Promise<void> {
	const { error } = await supabase
		.from('provider_connections')
		.upsert(defaultProviderConnection(userId, definition), {
			// Supabase JS/PostgREST expects comma-separated unique column names here,
			// not the Postgres constraint name.
			onConflict: 'user_id,provider_code,display_name',
			ignoreDuplicates: true
		});

	if (error) {
		throw error;
	}
}

export async function ensureConfiguredProviderConnections(
	supabase: Client,
	userId: string,
	definitions = configuredProviderDefinitions()
): Promise<void> {
	for (const definition of definitions) {
		await ensureProviderConnection(supabase, userId, definition);
	}
}

export async function listProviderConnections(supabase: Client): Promise<ProviderConnectionCard[]> {
	const { data, error } = await supabase
		.from('provider_connections_v')
		.select('*')
		.order('display_name', { ascending: true });

	if (error) {
		throw error;
	}

	return (data ?? []).flatMap((row) => {
		const card = toProviderConnectionCard(row);
		return card ? [card] : [];
	});
}

export async function listLatestProviderCostLines(
	supabase: Client,
	connectionIds: string[]
): Promise<Record<string, ProviderCostSnapshotLineRow[]>> {
	if (connectionIds.length === 0) {
		return {};
	}

	const output: Record<string, ProviderCostSnapshotLineRow[]> = {};

	// Phase 3 has one OpenAI connection. Batch this if multi-provider usage makes it hot.
	for (const connectionId of connectionIds) {
		const { data: snapshot, error: snapshotError } = await supabase
			.from('provider_cost_snapshots')
			.select('id, provider_connection_id')
			.eq('provider_connection_id', connectionId)
			.order('fetched_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (snapshotError) {
			throw snapshotError;
		}

		if (!snapshot) {
			continue;
		}

		const { data: lines, error: linesError } = await supabase
			.from('provider_cost_snapshot_lines')
			.select('*')
			.eq('snapshot_id', snapshot.id)
			.order('amount', { ascending: false });

		if (linesError) {
			throw linesError;
		}

		output[connectionId] = lines ?? [];
	}

	return output;
}

function snapshotInsert(
	userId: string,
	connectionId: string,
	result: ProviderCostFetchResult
): ProviderCostSnapshotInsert {
	return {
		user_id: userId,
		provider_connection_id: connectionId,
		period_start: result.periodStart,
		period_end_exclusive: result.periodEndExclusive,
		period_kind: 'month_to_date_utc',
		total_amount: result.totalAmount,
		currency: result.currency,
		provider_observed_at: result.providerObservedAt ?? null,
		raw_summary:
			result.rawSummary as Database['public']['Tables']['provider_cost_snapshots']['Insert']['raw_summary']
	};
}

function lineInserts(
	userId: string,
	snapshotId: string,
	result: ProviderCostFetchResult
): ProviderCostSnapshotLineInsert[] {
	return result.lines.map((line) => ({
		user_id: userId,
		snapshot_id: snapshotId,
		line_kind: 'cost',
		external_project_id: line.externalProjectId ?? null,
		external_api_key_id: line.externalApiKeyId ?? null,
		line_item: line.lineItem ?? null,
		amount: line.amount,
		currency: line.currency,
		quantity: line.quantity ?? null,
		raw_line:
			line.raw as Database['public']['Tables']['provider_cost_snapshot_lines']['Insert']['raw_line']
	}));
}

async function latestSnapshotMatches(
	supabase: Client,
	connectionId: string,
	result: ProviderCostFetchResult
): Promise<boolean> {
	const { data, error } = await supabase
		.from('provider_cost_snapshots')
		.select('period_start, period_end_exclusive, total_amount, currency')
		.eq('provider_connection_id', connectionId)
		.order('fetched_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (
		data?.period_start === result.periodStart &&
		data.period_end_exclusive === result.periodEndExclusive &&
		Number(data.total_amount) === result.totalAmount &&
		data.currency === result.currency
	);
}

async function updateConnectionSyncStatus(
	supabase: Client,
	connectionId: string,
	patch: ProviderConnectionUpdate
): Promise<void> {
	const { error } = await supabase
		.from('provider_connections')
		.update(patch)
		.eq('id', connectionId);

	if (error) {
		throw error;
	}
}

export async function refreshProviderCost(
	supabase: Client,
	userId: string,
	connectionId: string,
	options: RefreshProviderCostOptions = {}
): Promise<void> {
	const now = options.now ?? new Date();
	const startedAt = now.toISOString();
	await updateConnectionSyncStatus(supabase, connectionId, {
		last_sync_started_at: startedAt,
		last_sync_status: null,
		last_sync_error: null
	});

	try {
		const { data: connection, error } = await supabase
			.from('provider_connections')
			.select('provider_code, credential_name, external_project_ids')
			.eq('id', connectionId)
			.single();

		if (error) throw error;

		if (!isProviderCode(connection.provider_code)) {
			throw new ProviderSyncError(
				'bad_response',
				`Unsupported provider ${connection.provider_code}.`
			);
		}

		const definition = providerDefinition(connection.provider_code);
		const resolveCredential = options.resolveCredential ?? resolveServerEnvCredential;
		const adminKey = resolveCredential(
			definition.code,
			connection.credential_name ?? definition.credentialName
		);
		if (!adminKey) {
			throw new ProviderSyncError(
				'not_configured',
				`${definition.credentialName} is not configured.`
			);
		}

		const fetchMonthToDateCost = options.fetchMonthToDateCost ?? definition.fetchMonthToDateCost;
		const result = await fetchMonthToDateCost({
			adminKey,
			projectIds: connection.external_project_ids,
			now
		});

		if (result.provider !== definition.code) {
			throw new ProviderSyncError(
				'bad_response',
				`${definition.displayName} adapter returned mismatched provider data.`
			);
		}

		if (!(await latestSnapshotMatches(supabase, connectionId, result))) {
			const { data: snapshot, error: snapshotError } = await supabase
				.from('provider_cost_snapshots')
				.insert(snapshotInsert(userId, connectionId, result))
				.select('id')
				.single();

			if (snapshotError) throw snapshotError;

			const lines = lineInserts(userId, snapshot.id, result);
			if (lines.length > 0) {
				const { error: linesError } = await supabase
					.from('provider_cost_snapshot_lines')
					.insert(lines);
				if (linesError) throw linesError;
			}
		}

		await updateConnectionSyncStatus(supabase, connectionId, {
			last_sync_finished_at: new Date().toISOString(),
			last_sync_status: 'success',
			last_sync_error: null
		});
	} catch (error) {
		await updateConnectionSyncStatus(supabase, connectionId, {
			last_sync_finished_at: new Date().toISOString(),
			last_sync_status: 'error',
			last_sync_error: safeProviderErrorMessage(error)
		});
		throw error;
	}
}

export async function updateProviderBudget(
	supabase: Client,
	connectionId: string,
	patch: ProviderBudgetPatch
): Promise<void> {
	const { error } = await supabase
		.from('provider_connections')
		.update(patch)
		.eq('id', connectionId);

	if (error) {
		throw error;
	}
}
