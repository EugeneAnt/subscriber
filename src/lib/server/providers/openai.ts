import { ProviderSyncError } from './errors';
import {
	isSupportedCurrency,
	numericValue,
	paginationSafetyLimitMessage,
	redactProviderSecrets,
	utcMonthWindow as sharedUtcMonthWindow
} from './shared';
import type { ProviderCostFetchResult, ProviderCostLine, ProviderDefinition } from './types';

const costsUrl = 'https://api.openai.com/v1/organization/costs';
const supportedCurrencies = ['USD'] as const;
const maxPages = 20;

type MonthWindow = {
	periodStart: string;
	periodEndExclusive: string;
	startTime: number;
	endTime: number;
};

type OpenAICostResult = {
	amount?: {
		value?: unknown;
		currency?: unknown;
	};
	line_item?: unknown;
	project_id?: unknown;
	api_key_id?: unknown;
};

type OpenAICostBucket = {
	start_time?: unknown;
	end_time?: unknown;
	results?: unknown;
};

type OpenAICostPage = {
	has_more?: unknown;
	next_page?: unknown;
	data?: unknown;
};

export function utcMonthWindow(now: Date): MonthWindow {
	const window = sharedUtcMonthWindow(now);

	return {
		periodStart: window.periodStart,
		periodEndExclusive: window.periodEndExclusive,
		startTime: window.startTime,
		endTime: window.endTime
	};
}

function buildCostsUrl(
	window: MonthWindow,
	projectIds: string[] | undefined,
	page: string | null
): URL {
	const url = new URL(costsUrl);
	url.searchParams.set('start_time', String(window.startTime));
	url.searchParams.set('end_time', String(window.endTime));
	url.searchParams.set('bucket_width', '1d');
	url.searchParams.set('limit', '180');
	url.searchParams.append('group_by', 'project_id');
	url.searchParams.append('group_by', 'line_item');

	for (const projectId of projectIds ?? []) {
		url.searchParams.append('project_ids', projectId);
	}

	if (page) {
		url.searchParams.set('page', page);
	}

	return url;
}

async function readPage(response: Response): Promise<OpenAICostPage> {
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
			redactProviderSecrets(`OpenAI Costs API failed with HTTP ${response.status}: ${text}`),
			{
				status: response.status
			}
		);
	}

	try {
		return (text ? JSON.parse(text) : {}) as OpenAICostPage;
	} catch {
		throw new ProviderSyncError('bad_response', 'OpenAI Costs API returned invalid JSON.', {
			status: response.status
		});
	}
}

function amountFromResult(result: OpenAICostResult): { value: number; currency: string } {
	const value = result.amount?.value;
	const currency = result.amount?.currency;
	const parsedValue = numericValue(value);

	if (parsedValue === null || typeof currency !== 'string') {
		throw new ProviderSyncError('bad_response', 'OpenAI Costs API returned a malformed amount.');
	}

	const normalizedCurrency = currency.toUpperCase();
	if (!isSupportedCurrency(normalizedCurrency, supportedCurrencies)) {
		throw new ProviderSyncError(
			'unsupported_currency',
			`OpenAI Costs API returned unsupported currency ${normalizedCurrency}.`
		);
	}

	return { value: parsedValue, currency: normalizedCurrency };
}

function sanitizeResult(result: OpenAICostResult): OpenAICostResult {
	return {
		amount: result.amount,
		line_item: result.line_item,
		project_id: result.project_id,
		api_key_id: result.api_key_id
	};
}

function linesFromBucket(bucket: OpenAICostBucket): ProviderCostLine[] {
	const results = Array.isArray(bucket.results) ? bucket.results : [];

	return results.map((rawResult) => {
		const result = rawResult as OpenAICostResult;
		const amount = amountFromResult(result);

		return {
			externalProjectId: typeof result.project_id === 'string' ? result.project_id : null,
			externalApiKeyId: typeof result.api_key_id === 'string' ? result.api_key_id : null,
			lineItem: typeof result.line_item === 'string' ? result.line_item : null,
			amount: amount.value,
			currency: amount.currency,
			raw: sanitizeResult(result)
		};
	});
}

function sanitizedSummary(pages: OpenAICostPage[]): unknown {
	return {
		pages: pages.map((page) => ({
			has_more: page.has_more === true,
			next_page: typeof page.next_page === 'string' ? page.next_page : null,
			bucket_count: Array.isArray(page.data) ? page.data.length : 0
		}))
	};
}

export async function fetchOpenAIMonthToDateCost(input: {
	adminKey: string;
	projectIds?: string[];
	now: Date;
	fetch?: typeof fetch;
}): Promise<ProviderCostFetchResult> {
	const fetchImpl = input.fetch ?? fetch;
	const window = utcMonthWindow(input.now);
	const pages: OpenAICostPage[] = [];
	const lines: ProviderCostLine[] = [];
	let pageCursor: string | null = null;

	for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
		let response: Response;
		try {
			response = await fetchImpl(buildCostsUrl(window, input.projectIds, pageCursor), {
				headers: { authorization: `Bearer ${input.adminKey}` }
			});
		} catch (error) {
			const message =
				error instanceof Error ? redactProviderSecrets(error.message) : 'Network request failed.';
			throw new ProviderSyncError('network', `OpenAI Costs API request failed: ${message}`);
		}

		const page = await readPage(response);
		pages.push(page);

		const buckets = Array.isArray(page.data) ? page.data : [];
		for (const rawBucket of buckets) {
			lines.push(...linesFromBucket(rawBucket as OpenAICostBucket));
		}

		if (page.has_more !== true || typeof page.next_page !== 'string' || page.next_page === '') {
			break;
		}

		pageCursor = page.next_page;

		if (pageIndex === maxPages - 1) {
			throw new ProviderSyncError(
				'bad_response',
				paginationSafetyLimitMessage('OpenAI Costs API', maxPages)
			);
		}
	}

	const currencies = new Set(lines.map((line) => line.currency));
	if (currencies.size > 1) {
		throw new ProviderSyncError(
			'unsupported_currency',
			'OpenAI Costs API returned multiple currencies.'
		);
	}

	const currency = lines[0]?.currency ?? 'USD';
	return {
		provider: 'openai',
		periodStart: window.periodStart,
		periodEndExclusive: window.periodEndExclusive,
		totalAmount: lines.reduce((total, line) => total + line.amount, 0),
		currency,
		providerObservedAt: null,
		lines,
		rawSummary: sanitizedSummary(pages)
	};
}

export const openaiProvider: ProviderDefinition = {
	code: 'openai',
	displayName: 'OpenAI',
	connectionDisplayName: 'OpenAI API',
	credentialName: 'OPENAI_ADMIN_KEY',
	defaultCurrency: 'USD',
	defaultWarningRemainingAmount: 5,
	defaultCriticalRemainingAmount: 1,
	externalProjectFilter: 'project_ids',
	capabilities: ['costs', 'project_breakdown', 'line_item_breakdown'],
	fetchMonthToDateCost: fetchOpenAIMonthToDateCost
};
