export type ProviderCode = 'openai' | 'anthropic';

export type ProviderCapability =
	| 'costs'
	| 'usage'
	| 'provider_balance'
	| 'provider_thresholds'
	| 'project_breakdown'
	| 'workspace_breakdown'
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

export type ProviderCostFetcher = (input: {
	adminKey: string;
	projectIds?: string[];
	now: Date;
	fetch?: typeof fetch;
}) => Promise<ProviderCostFetchResult>;

export type ProviderDefinition = {
	code: ProviderCode;
	displayName: string;
	connectionDisplayName: string;
	credentialName: string;
	defaultCurrency: string;
	defaultWarningRemainingAmount: number | null;
	defaultCriticalRemainingAmount: number | null;
	capabilities: ProviderCapability[];
	fetchMonthToDateCost: ProviderCostFetcher;
};
