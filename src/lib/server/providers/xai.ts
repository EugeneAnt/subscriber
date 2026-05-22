import { ProviderSyncError } from './errors';
import {
	isSupportedCurrency,
	numericValue,
	redactProviderSecrets,
	utcMonthWindow as sharedUtcMonthWindow
} from './shared';
import type { ProviderCostFetchResult, ProviderCostLine, ProviderDefinition } from './types';

// https://docs.x.ai/developers/management-api-guide
// https://docs.x.ai/developers/rest-api-reference/management/billing#get-historical-usage-of-the-api
const managementApiBaseUrl = 'https://management-api.x.ai';
const supportedCurrencies = ['USD'] as const;

type MonthWindow = {
	periodStart: string;
	periodEndExclusive: string;
	startTime: string;
	endTime: string;
};

type XaiValidationResponse = {
	apiKeyId?: unknown;
	teamId?: unknown;
	scope?: unknown;
	scopeId?: unknown;
	name?: unknown;
	acls?: unknown;
	redactedApiKey?: unknown;
};

type XaiUsageDataPoint = {
	timestamp?: unknown;
	values?: unknown;
};

type XaiUsageSeries = {
	group?: unknown;
	groupLabels?: unknown;
	dataPoints?: unknown;
};

type XaiUsageResponse = {
	timeSeries?: unknown;
	limitReached?: unknown;
};

export function utcMonthWindow(now: Date): MonthWindow {
	const window = sharedUtcMonthWindow(now);
	const start = new Date(window.startTime * 1000);
	const endInclusive = new Date(window.endTime * 1000 - 1000);

	return {
		periodStart: window.periodStart,
		periodEndExclusive: window.periodEndExclusive,
		startTime: xaiDateTime(start),
		endTime: xaiDateTime(endInclusive)
	};
}

function xaiDateTime(date: Date): string {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

function authHeaders(adminKey: string, json = false): HeadersInit {
	return {
		authorization: `Bearer ${adminKey}`,
		...(json ? { 'content-type': 'application/json' } : {})
	};
}

function validationUrl(): URL {
	return new URL('/auth/management-keys/validation', managementApiBaseUrl);
}

function usageUrl(teamId: string): URL {
	return new URL(`/v1/billing/teams/${encodeURIComponent(teamId)}/usage`, managementApiBaseUrl);
}

function usageRequestBody(window: MonthWindow): string {
	return JSON.stringify({
		analyticsRequest: {
			timeRange: {
				startTime: window.startTime,
				endTime: window.endTime,
				timezone: 'Etc/GMT'
			},
			timeUnit: 'TIME_UNIT_DAY',
			values: [{ name: 'usd', aggregation: 'AGGREGATION_SUM' }],
			groupBy: ['description'],
			filters: []
		}
	});
}

async function readJson(response: Response, apiName: string): Promise<unknown> {
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
			redactProviderSecrets(`${apiName} failed with HTTP ${response.status}: ${text}`),
			{ status: response.status }
		);
	}

	try {
		return text ? JSON.parse(text) : {};
	} catch {
		throw new ProviderSyncError('bad_response', `${apiName} returned invalid JSON.`, {
			status: response.status
		});
	}
}

async function requestJson(
	fetchImpl: typeof fetch,
	url: URL,
	init: RequestInit,
	apiName: string
): Promise<unknown> {
	try {
		return await readJson(await fetchImpl(url, init), apiName);
	} catch (error) {
		if (error instanceof ProviderSyncError) {
			throw error;
		}

		const message =
			error instanceof Error ? redactProviderSecrets(error.message) : 'Network request failed.';
		throw new ProviderSyncError('network', `${apiName} request failed: ${message}`);
	}
}

function validationTeamId(response: XaiValidationResponse): string {
	if (response.scope === 'SCOPE_TEAM') {
		if (typeof response.scopeId === 'string' && response.scopeId.trim() !== '') {
			return response.scopeId;
		}

		if (typeof response.teamId === 'string' && response.teamId.trim() !== '') {
			return response.teamId;
		}
	}

	if (
		typeof response.scope === 'undefined' &&
		typeof response.teamId === 'string' &&
		response.teamId.trim() !== ''
	) {
		return response.teamId;
	}

	throw new ProviderSyncError(
		'bad_response',
		'xAI Management API validation did not return a team-scoped key.'
	);
}

function seriesLabel(series: XaiUsageSeries): string | null {
	if (Array.isArray(series.groupLabels) && typeof series.groupLabels[0] === 'string') {
		return series.groupLabels[0];
	}

	if (Array.isArray(series.group) && typeof series.group[0] === 'string') {
		return series.group[0];
	}

	return null;
}

function amountFromDataPoint(dataPoint: XaiUsageDataPoint): number {
	if (!Array.isArray(dataPoint.values)) {
		throw new ProviderSyncError(
			'bad_response',
			'xAI Billing Usage API returned a malformed amount.'
		);
	}

	const value = numericValue(dataPoint.values[0]);
	if (value === null) {
		throw new ProviderSyncError(
			'bad_response',
			'xAI Billing Usage API returned a malformed amount.'
		);
	}

	return value;
}

function sanitizeSeries(series: XaiUsageSeries, amount: number): unknown {
	return {
		group: Array.isArray(series.group) ? series.group : null,
		groupLabels: Array.isArray(series.groupLabels) ? series.groupLabels : null,
		dataPointCount: Array.isArray(series.dataPoints) ? series.dataPoints.length : 0,
		amount,
		currency: 'USD'
	};
}

function linesFromUsage(response: XaiUsageResponse): ProviderCostLine[] {
	if (response.limitReached === true) {
		throw new ProviderSyncError(
			'bad_response',
			'xAI Billing Usage API reached its result cardinality limit.'
		);
	}

	if (!Array.isArray(response.timeSeries)) {
		throw new ProviderSyncError(
			'bad_response',
			'xAI Billing Usage API returned malformed time series.'
		);
	}

	return response.timeSeries.map((rawSeries) => {
		const series = rawSeries as XaiUsageSeries;
		if (!Array.isArray(series.dataPoints)) {
			throw new ProviderSyncError(
				'bad_response',
				'xAI Billing Usage API returned malformed data points.'
			);
		}

		const amount = series.dataPoints.reduce(
			(total, rawDataPoint) => total + amountFromDataPoint(rawDataPoint as XaiUsageDataPoint),
			0
		);

		return {
			externalProjectId: null,
			externalApiKeyId: null,
			lineItem: seriesLabel(series),
			amount,
			currency: 'USD',
			raw: sanitizeSeries(series, amount)
		};
	});
}

function sanitizedSummary(validation: XaiValidationResponse, response: XaiUsageResponse): unknown {
	return {
		teamId: validationTeamId(validation),
		scope: typeof validation.scope === 'string' ? validation.scope : null,
		apiKeyId: typeof validation.apiKeyId === 'string' ? validation.apiKeyId : null,
		seriesCount: Array.isArray(response.timeSeries) ? response.timeSeries.length : 0,
		limitReached: response.limitReached === true
	};
}

export async function fetchXaiMonthToDateCost(input: {
	adminKey: string;
	projectIds?: string[];
	now: Date;
	fetch?: typeof fetch;
}): Promise<ProviderCostFetchResult> {
	if (input.projectIds && input.projectIds.length > 0) {
		throw new ProviderSyncError(
			'unsupported_filter',
			'xAI Billing Usage API does not support external project filters.'
		);
	}

	const fetchImpl = input.fetch ?? fetch;
	const window = utcMonthWindow(input.now);

	const validation = (await requestJson(
		fetchImpl,
		validationUrl(),
		{ headers: authHeaders(input.adminKey) },
		'xAI Management API validation'
	)) as XaiValidationResponse;
	const teamId = validationTeamId(validation);

	const usage = (await requestJson(
		fetchImpl,
		usageUrl(teamId),
		{
			method: 'POST',
			headers: authHeaders(input.adminKey, true),
			body: usageRequestBody(window)
		},
		'xAI Billing Usage API'
	)) as XaiUsageResponse;
	const lines = linesFromUsage(usage);
	const currencies = new Set(lines.map((line) => line.currency));
	// The xAI usage endpoint currently returns only USD values. An empty series
	// means zero month-to-date spend, so the canonical snapshot currency is USD.
	if (
		currencies.size > 1 ||
		!isSupportedCurrency(lines[0]?.currency ?? 'USD', supportedCurrencies)
	) {
		throw new ProviderSyncError(
			'unsupported_currency',
			'xAI Billing Usage API returned unsupported currencies.'
		);
	}

	return {
		provider: 'xai',
		periodStart: window.periodStart,
		periodEndExclusive: window.periodEndExclusive,
		totalAmount: lines.reduce((total, line) => total + line.amount, 0),
		currency: lines[0]?.currency ?? 'USD',
		providerObservedAt: null,
		lines,
		rawSummary: sanitizedSummary(validation, usage)
	};
}

export const xaiProvider: ProviderDefinition = {
	code: 'xai',
	displayName: 'xAI',
	connectionDisplayName: 'xAI API',
	credentialName: 'XAI_MANAGEMENT_KEY',
	defaultCurrency: 'USD',
	defaultWarningRemainingAmount: 5,
	defaultCriticalRemainingAmount: 1,
	externalProjectFilter: null,
	capabilities: ['costs', 'line_item_breakdown'],
	fetchMonthToDateCost: fetchXaiMonthToDateCost
};
