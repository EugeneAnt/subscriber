export type ProviderMonthWindow = {
	periodStart: string;
	periodEndExclusive: string;
	startTime: number;
	endTime: number;
	startingAt: string;
	endingAt: string;
};

function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function unixSeconds(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}

export function utcMonthWindow(now: Date): ProviderMonthWindow {
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const tomorrow = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
	);

	return {
		periodStart: isoDate(monthStart),
		periodEndExclusive: isoDate(tomorrow),
		startTime: unixSeconds(monthStart),
		endTime: unixSeconds(tomorrow),
		startingAt: monthStart.toISOString(),
		endingAt: tomorrow.toISOString()
	};
}

export function redactProviderSecrets(value: string): string {
	return value.replace(/\b(?:sk|xai)-[A-Za-z0-9_-]+\b/g, '[redacted]');
}

export function numericValue(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	if (trimmed === '') {
		return null;
	}

	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

export function isSupportedCurrency(
	currency: string,
	supportedCurrencies: readonly string[]
): boolean {
	return supportedCurrencies.includes(currency);
}

export function paginationSafetyLimitMessage(providerName: string, maxPages: number): string {
	return `${providerName} pagination exceeded safety limit of ${maxPages} pages.`;
}
