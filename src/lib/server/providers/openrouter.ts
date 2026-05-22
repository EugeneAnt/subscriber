import { ProviderSyncError } from './errors';
import {
	isSupportedCurrency,
	numericValue,
	paginationSafetyLimitMessage,
	redactProviderSecrets,
	utcMonthWindow as sharedUtcMonthWindow
} from './shared';
import type { ProviderCostFetchResult, ProviderCostLine, ProviderDefinition } from './types';

// https://openrouter.ai/docs/api/api-reference/api-keys/list
// https://openrouter.ai/docs/guides/overview/auth/management-api-keys
const keysUrl = 'https://openrouter.ai/api/v1/keys';
const supportedCurrencies = ['USD'] as const;
// OpenRouter documents API-key listing as returning the most recent 100 keys
// with offset pagination. The endpoint does not expose a limit parameter.
const pageSize = 100;
const maxPages = 20;

type MonthWindow = {
	periodStart: string;
	periodEndExclusive: string;
};

type OpenRouterKey = {
	hash?: unknown;
	label?: unknown;
	name?: unknown;
	disabled?: unknown;
	limit?: unknown;
	limit_remaining?: unknown;
	limit_reset?: unknown;
	include_byok_in_limit?: unknown;
	usage?: unknown;
	usage_daily?: unknown;
	usage_weekly?: unknown;
	usage_monthly?: unknown;
	byok_usage?: unknown;
	byok_usage_daily?: unknown;
	byok_usage_weekly?: unknown;
	byok_usage_monthly?: unknown;
	workspace_id?: unknown;
	created_at?: unknown;
	updated_at?: unknown;
	expires_at?: unknown;
};

type OpenRouterKeysPage = {
	data?: unknown;
};

export function utcMonthWindow(now: Date): MonthWindow {
	const window = sharedUtcMonthWindow(now);

	return {
		periodStart: window.periodStart,
		periodEndExclusive: window.periodEndExclusive
	};
}

function buildKeysUrl(offset: number): URL {
	const url = new URL(keysUrl);
	url.searchParams.set('include_disabled', 'true');
	if (offset > 0) {
		url.searchParams.set('offset', String(offset));
	}

	return url;
}

async function readPage(response: Response): Promise<OpenRouterKeysPage> {
	const text = await response.text();

	if (!response.ok) {
		const kind =
			response.status === 401 || response.status === 403
				? 'unauthorized'
				: response.status === 429
					? 'rate_limited'
					: response.status >= 500
						? 'network'
						: 'bad_response';
		throw new ProviderSyncError(
			kind,
			redactProviderSecrets(
				`OpenRouter Management API failed with HTTP ${response.status}: ${text}`
			),
			{ status: response.status }
		);
	}

	try {
		return (text ? JSON.parse(text) : {}) as OpenRouterKeysPage;
	} catch {
		throw new ProviderSyncError(
			'bad_response',
			'OpenRouter Management API returned invalid JSON.',
			{
				status: response.status
			}
		);
	}
}

async function fetchPage(
	fetchImpl: typeof fetch,
	adminKey: string,
	offset: number
): Promise<OpenRouterKeysPage> {
	try {
		return await readPage(
			await fetchImpl(buildKeysUrl(offset), {
				headers: {
					authorization: `Bearer ${adminKey}`,
					'content-type': 'application/json'
				}
			})
		);
	} catch (error) {
		if (error instanceof ProviderSyncError) {
			throw error;
		}

		const message =
			error instanceof Error ? redactProviderSecrets(error.message) : 'Network request failed.';
		throw new ProviderSyncError('network', `OpenRouter Management API request failed: ${message}`);
	}
}

function keyUsageMonthly(key: OpenRouterKey): number {
	const value = numericValue(key.usage_monthly);
	if (value === null) {
		throw new ProviderSyncError(
			'bad_response',
			'OpenRouter Management API returned malformed key usage.'
		);
	}

	return value;
}

function keyLineItem(key: OpenRouterKey): string | null {
	if (typeof key.name === 'string' && key.name.trim() !== '') {
		return key.name;
	}

	if (typeof key.label === 'string' && key.label.trim() !== '') {
		return key.label;
	}

	return null;
}

function sanitizeKey(key: OpenRouterKey, amount: number): unknown {
	return {
		hash: typeof key.hash === 'string' ? key.hash : null,
		name: typeof key.name === 'string' ? key.name : null,
		label: typeof key.label === 'string' ? key.label : null,
		disabled: typeof key.disabled === 'boolean' ? key.disabled : null,
		limit: numericValue(key.limit),
		limit_remaining: numericValue(key.limit_remaining),
		limit_reset: typeof key.limit_reset === 'string' ? key.limit_reset : null,
		include_byok_in_limit:
			typeof key.include_byok_in_limit === 'boolean' ? key.include_byok_in_limit : null,
		usage_monthly: amount,
		usage: numericValue(key.usage),
		usage_daily: numericValue(key.usage_daily),
		usage_weekly: numericValue(key.usage_weekly),
		byok_usage_monthly: numericValue(key.byok_usage_monthly),
		byok_usage: numericValue(key.byok_usage),
		byok_usage_daily: numericValue(key.byok_usage_daily),
		byok_usage_weekly: numericValue(key.byok_usage_weekly),
		workspace_id: typeof key.workspace_id === 'string' ? key.workspace_id : null,
		created_at: typeof key.created_at === 'string' ? key.created_at : null,
		updated_at: typeof key.updated_at === 'string' ? key.updated_at : null,
		expires_at: typeof key.expires_at === 'string' ? key.expires_at : null
	};
}

function lineFromKey(key: OpenRouterKey): ProviderCostLine {
	const amount = keyUsageMonthly(key);

	return {
		externalProjectId: typeof key.workspace_id === 'string' ? key.workspace_id : null,
		externalApiKeyId: typeof key.hash === 'string' ? key.hash : null,
		lineItem: keyLineItem(key),
		amount,
		currency: 'USD',
		raw: sanitizeKey(key, amount)
	};
}

function sanitizedSummary(pages: OpenRouterKeysPage[], totalKeys: number): unknown {
	return {
		page_count: pages.length,
		key_count: totalKeys,
		include_disabled: true
	};
}

export async function fetchOpenRouterMonthToDateCost(input: {
	adminKey: string;
	projectIds?: string[];
	now: Date;
	fetch?: typeof fetch;
}): Promise<ProviderCostFetchResult> {
	if (input.projectIds && input.projectIds.length > 0) {
		throw new ProviderSyncError(
			'unsupported_filter',
			'OpenRouter Management API does not support external project filters in this slice.'
		);
	}

	const fetchImpl = input.fetch ?? fetch;
	const window = utcMonthWindow(input.now);
	const pages: OpenRouterKeysPage[] = [];
	const lines: ProviderCostLine[] = [];

	for (let page = 0; page < maxPages; page += 1) {
		const response = await fetchPage(fetchImpl, input.adminKey, page * pageSize);
		pages.push(response);

		if (!Array.isArray(response.data)) {
			throw new ProviderSyncError(
				'bad_response',
				'OpenRouter Management API returned malformed API key data.'
			);
		}

		lines.push(...response.data.map((rawKey) => lineFromKey(rawKey as OpenRouterKey)));

		if (response.data.length < pageSize) {
			const currencies = new Set(lines.map((line) => line.currency));
			if (
				currencies.size > 1 ||
				!isSupportedCurrency(lines[0]?.currency ?? 'USD', supportedCurrencies)
			) {
				throw new ProviderSyncError(
					'unsupported_currency',
					'OpenRouter Management API returned unsupported currencies.'
				);
			}

			return {
				provider: 'openrouter',
				periodStart: window.periodStart,
				periodEndExclusive: window.periodEndExclusive,
				totalAmount: lines.reduce((total, line) => total + line.amount, 0),
				currency: lines[0]?.currency ?? 'USD',
				providerObservedAt: null,
				lines,
				rawSummary: sanitizedSummary(pages, lines.length)
			};
		}
	}

	throw new ProviderSyncError(
		'bad_response',
		paginationSafetyLimitMessage('OpenRouter Management API key listing', maxPages)
	);
}

export const openrouterProvider: ProviderDefinition = {
	code: 'openrouter',
	displayName: 'OpenRouter',
	connectionDisplayName: 'OpenRouter API',
	credentialName: 'OPENROUTER_MANAGEMENT_KEY',
	defaultCurrency: 'USD',
	defaultWarningRemainingAmount: 5,
	defaultCriticalRemainingAmount: 1,
	externalProjectFilter: null,
	capabilities: ['costs', 'line_item_breakdown'],
	fetchMonthToDateCost: fetchOpenRouterMonthToDateCost
};
