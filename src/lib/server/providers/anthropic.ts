import { ProviderSyncError } from './errors';
import {
	isSupportedCurrency,
	numericValue,
	paginationSafetyLimitMessage,
	redactProviderSecrets,
	utcMonthWindow as sharedUtcMonthWindow
} from './shared';
import type { ProviderCostFetchResult, ProviderCostLine, ProviderDefinition } from './types';

// https://platform.claude.com/docs/en/api/admin/cost_report/retrieve
const costReportUrl = 'https://api.anthropic.com/v1/organizations/cost_report';
const supportedCurrencies = ['USD'] as const;
const maxPages = 20;

type MonthWindow = {
	periodStart: string;
	periodEndExclusive: string;
	startingAt: string;
	endingAt: string;
};

type AnthropicCostResult = {
	amount?: unknown;
	currency?: unknown;
	workspace_id?: unknown;
	description?: unknown;
	cost_type?: unknown;
	model?: unknown;
	service_tier?: unknown;
	token_type?: unknown;
	context_window?: unknown;
	inference_geo?: unknown;
};

type AnthropicCostBucket = {
	starting_at?: unknown;
	ending_at?: unknown;
	results?: unknown;
};

type AnthropicCostPage = {
	has_more?: unknown;
	next_page?: unknown;
	data?: unknown;
};

export function utcMonthWindow(now: Date): MonthWindow {
	const window = sharedUtcMonthWindow(now);

	return {
		periodStart: window.periodStart,
		periodEndExclusive: window.periodEndExclusive,
		startingAt: window.startingAt,
		endingAt: window.endingAt
	};
}

function buildCostReportUrl(window: MonthWindow, page: string | null): URL {
	const url = new URL(costReportUrl);
	url.searchParams.set('starting_at', window.startingAt);
	url.searchParams.set('ending_at', window.endingAt);
	url.searchParams.set('bucket_width', '1d');
	url.searchParams.set('limit', '31');
	url.searchParams.append('group_by[]', 'workspace_id');
	url.searchParams.append('group_by[]', 'description');

	if (page) {
		url.searchParams.set('page', page);
	}

	return url;
}

async function readPage(response: Response): Promise<AnthropicCostPage> {
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
				`Anthropic Cost Report API failed with HTTP ${response.status}: ${text}`
			),
			{ status: response.status }
		);
	}

	try {
		return (text ? JSON.parse(text) : {}) as AnthropicCostPage;
	} catch {
		throw new ProviderSyncError(
			'bad_response',
			'Anthropic Cost Report API returned invalid JSON.',
			{
				status: response.status
			}
		);
	}
}

function amountFromResult(result: AnthropicCostResult): { value: number; currency: string } {
	const value = numericValue(result.amount);
	const currency = result.currency;

	if (value === null || typeof currency !== 'string') {
		throw new ProviderSyncError(
			'bad_response',
			'Anthropic Cost Report API returned a malformed amount.'
		);
	}

	const normalizedCurrency = currency.toUpperCase();
	if (!isSupportedCurrency(normalizedCurrency, supportedCurrencies)) {
		throw new ProviderSyncError(
			'unsupported_currency',
			`Anthropic Cost Report API returned unsupported currency ${normalizedCurrency}.`
		);
	}

	return { value: value / 100, currency: normalizedCurrency };
}

function sanitizeResult(result: AnthropicCostResult): AnthropicCostResult {
	return {
		amount: result.amount,
		currency: result.currency,
		workspace_id: result.workspace_id,
		description: result.description,
		cost_type: result.cost_type,
		model: result.model,
		service_tier: result.service_tier,
		token_type: result.token_type,
		context_window: result.context_window,
		inference_geo: result.inference_geo
	};
}

function linesFromBucket(bucket: AnthropicCostBucket): ProviderCostLine[] {
	const results = Array.isArray(bucket.results) ? bucket.results : [];

	return results.map((rawResult) => {
		const result = rawResult as AnthropicCostResult;
		const amount = amountFromResult(result);

		return {
			externalProjectId: typeof result.workspace_id === 'string' ? result.workspace_id : null,
			externalApiKeyId: null,
			lineItem: typeof result.description === 'string' ? result.description : null,
			amount: amount.value,
			currency: amount.currency,
			raw: sanitizeResult(result)
		};
	});
}

function sanitizedSummary(pages: AnthropicCostPage[]): unknown {
	return {
		pages: pages.map((page) => ({
			has_more: page.has_more === true,
			next_page: typeof page.next_page === 'string' ? page.next_page : null,
			bucket_count: Array.isArray(page.data) ? page.data.length : 0
		}))
	};
}

export async function fetchAnthropicMonthToDateCost(input: {
	adminKey: string;
	projectIds?: string[];
	now: Date;
	fetch?: typeof fetch;
}): Promise<ProviderCostFetchResult> {
	if (input.projectIds && input.projectIds.length > 0) {
		throw new ProviderSyncError(
			'unsupported_filter',
			'Anthropic Cost Report API does not support external project/workspace filters; it is grouped by workspace instead.'
		);
	}

	const fetchImpl = input.fetch ?? fetch;
	const window = utcMonthWindow(input.now);
	const pages: AnthropicCostPage[] = [];
	const lines: ProviderCostLine[] = [];
	let pageCursor: string | null = null;

	for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
		let response: Response;
		try {
			response = await fetchImpl(buildCostReportUrl(window, pageCursor), {
				headers: {
					'anthropic-version': '2023-06-01',
					'user-agent': 'Subscriber/0.1 (https://github.com/EugeneAnt/subscriber)',
					'x-api-key': input.adminKey
				}
			});
		} catch (error) {
			const message =
				error instanceof Error ? redactProviderSecrets(error.message) : 'Network request failed.';
			throw new ProviderSyncError(
				'network',
				`Anthropic Cost Report API request failed: ${message}`
			);
		}

		const page = await readPage(response);
		pages.push(page);

		const buckets = Array.isArray(page.data) ? page.data : [];
		for (const rawBucket of buckets) {
			lines.push(...linesFromBucket(rawBucket as AnthropicCostBucket));
		}

		if (page.has_more !== true || typeof page.next_page !== 'string' || page.next_page === '') {
			break;
		}

		pageCursor = page.next_page;

		if (pageIndex === maxPages - 1) {
			throw new ProviderSyncError(
				'bad_response',
				paginationSafetyLimitMessage('Anthropic Cost Report API', maxPages)
			);
		}
	}

	const currencies = new Set(lines.map((line) => line.currency));
	if (currencies.size > 1) {
		throw new ProviderSyncError(
			'unsupported_currency',
			'Anthropic Cost Report API returned multiple currencies.'
		);
	}

	const currency = lines[0]?.currency ?? 'USD';
	return {
		provider: 'anthropic',
		periodStart: window.periodStart,
		periodEndExclusive: window.periodEndExclusive,
		totalAmount: lines.reduce((total, line) => total + line.amount, 0),
		currency,
		providerObservedAt: null,
		lines,
		rawSummary: sanitizedSummary(pages)
	};
}

export const anthropicProvider: ProviderDefinition = {
	code: 'anthropic',
	displayName: 'Anthropic',
	connectionDisplayName: 'Anthropic API',
	credentialName: 'ANTHROPIC_ADMIN_KEY',
	defaultCurrency: 'USD',
	defaultWarningRemainingAmount: 5,
	defaultCriticalRemainingAmount: 1,
	externalProjectFilter: null,
	capabilities: ['costs', 'workspace_breakdown', 'line_item_breakdown'],
	fetchMonthToDateCost: fetchAnthropicMonthToDateCost
};
