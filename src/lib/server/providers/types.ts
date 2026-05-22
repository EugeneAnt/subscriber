export type ProviderCode = 'openai';

export type ProviderCapability =
	| 'costs'
	| 'usage'
	| 'provider_balance'
	| 'provider_thresholds'
	| 'project_breakdown'
	| 'line_item_breakdown';

export type ProviderCostLine = {
	externalProjectId?: string | null;
	externalApiKeyId?: string | null;
	lineItem?: string | null;
	amount: number;
	currency: string;
	quantity?: number | null;
	raw: unknown;
};

export type ProviderCostFetchResult = {
	provider: ProviderCode;
	periodStart: string;
	periodEndExclusive: string;
	totalAmount: number;
	currency: string;
	providerObservedAt?: string | null;
	lines: ProviderCostLine[];
	rawSummary: unknown;
};

export type ProviderAdapter = {
	code: ProviderCode;
	capabilities: ProviderCapability[];
	fetchMonthToDateCost(input: {
		adminKey: string;
		projectIds?: string[];
		now: Date;
		fetch?: typeof fetch;
	}): Promise<ProviderCostFetchResult>;
};
