import type {
	TrackedItemBurnRow,
	TrackedItemEventRow,
	TrackedItemTableRow
} from '$lib/server/tracked-items';
import type {
	DashboardBurn,
	DashboardEvent,
	DashboardFilters,
	DashboardItem
} from '$lib/types/dashboard';
import type { Database } from '$lib/types/database';

type TrackedItemType = Database['public']['Enums']['tracked_item_type'];

const itemTypes = new Set(['subscription', 'expiry', 'hybrid']);
const statuses = new Set(['active', 'paused', 'cancelled', 'expired']);
const eventKinds = new Set(['billing', 'expiry']);

function cleanText(value: string | null): string | undefined {
	const trimmed = value?.trim() ?? '';
	return trimmed === '' ? undefined : trimmed;
}

function isPresentString(value: string | null): value is string {
	return value !== null && value !== '';
}

function parseType(value: string | null): TrackedItemType | undefined {
	return itemTypes.has(value ?? '') ? (value as TrackedItemType) : undefined;
}

function parseStatus(value: string | null): DashboardFilters['status'] {
	return statuses.has(value ?? '') ? (value as DashboardFilters['status']) : undefined;
}

function dateFrom(startDate: string, days: number): string {
	const date = new Date(`${startDate}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function parseNumeric(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value !== 'string' || value.trim() === '') {
		return null;
	}

	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

export function parseDashboardFilters(searchParams: URLSearchParams): DashboardFilters {
	const filters: DashboardFilters = {};
	const type = parseType(searchParams.get('type'));
	const status = parseStatus(searchParams.get('status'));
	const category = cleanText(searchParams.get('category'));
	const provider = cleanText(searchParams.get('provider'));

	if (type) filters.type = type;
	if (status) filters.status = status;
	if (category) filters.category = category;
	if (provider) filters.provider = provider;

	return filters;
}

export function hasDashboardFilters(filters: DashboardFilters): boolean {
	return Object.values(filters).some((value) => value !== undefined);
}

export function toDashboardItems(rows: Partial<TrackedItemTableRow>[]): DashboardItem[] {
	return rows.filter((row): row is DashboardItem => {
		return (
			typeof row.id === 'string' &&
			typeof row.name === 'string' &&
			itemTypes.has(row.type ?? '') &&
			statuses.has(row.effective_status ?? '')
		);
	});
}

export function toDashboardEvents(rows: Partial<TrackedItemEventRow>[]): DashboardEvent[] {
	return rows.filter((row): row is DashboardEvent => {
		return (
			typeof row.tracked_item_id === 'string' &&
			typeof row.name === 'string' &&
			typeof row.event_date === 'string' &&
			eventKinds.has(row.event_kind ?? '')
		);
	});
}

export function toDashboardBurn(rows: Partial<TrackedItemBurnRow>[]): DashboardBurn[] {
	return rows.flatMap((row) => {
		const monthlyBurn = parseNumeric(row.monthly_burn);

		if (typeof row.currency !== 'string' || monthlyBurn === null) {
			return [];
		}

		return [{ currency: row.currency, monthly_burn: monthlyBurn }];
	});
}

export function getDashboardSummary(
	items: DashboardItem[],
	events: DashboardEvent[],
	today: string
): { activeCount: number; upcoming30Count: number } {
	const through = dateFrom(today, 30);

	return {
		activeCount: items.filter((item) => item.effective_status === 'active').length,
		upcoming30Count: events.filter(
			(event) => event.event_date >= today && event.event_date <= through
		).length
	};
}

export function getDistinctOptions(items: DashboardItem[]): {
	categories: string[];
	providers: string[];
} {
	return {
		categories: Array.from(
			new Set(items.map((item) => item.category).filter(isPresentString))
		).sort(),
		providers: Array.from(
			new Set(items.map((item) => item.provider).filter(isPresentString))
		).sort()
	};
}

export function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}
