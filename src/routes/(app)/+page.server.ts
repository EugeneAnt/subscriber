import { error, fail, redirect } from '@sveltejs/kit';
import {
	getDashboardSummary,
	getDistinctOptions,
	hasDashboardFilters,
	parseDashboardFilters,
	toDashboardBurn,
	toDashboardEvents,
	toDashboardItems,
	toDashboardPaygSpend,
	todayIso
} from '$lib/server/dashboard';
import { consumeFlash, setFlash } from '$lib/server/flash';
import {
	cacheMinutesFromEnv,
	ensureConfiguredProviderConnections,
	isAnyProviderCostSyncConfigured,
	isSnapshotFresh,
	listLatestProviderCostLines,
	listProviderConnections,
	normalizeBudgetInput,
	refreshProviderCost,
	updateProviderBudget
} from '$lib/server/provider-costs';
import { configuredProviderDefinitions } from '$lib/server/providers';
import { safeRedirectPath } from '$lib/server/redirects';
import { countUnreadReminders, listDueReminders } from '$lib/server/reminders';
import {
	deleteItem,
	listBurn,
	listItemsForTable,
	listUpcomingEvents
} from '$lib/server/tracked-items';
import type { Actions, PageServerLoad } from './$types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dashboardTabs = new Set(['subscriptions', 'payg']);

function parseDashboardTab(url: URL): 'subscriptions' | 'payg' {
	const tab = url.searchParams.get('tab');
	return dashboardTabs.has(tab ?? '') ? (tab as 'subscriptions' | 'payg') : 'subscriptions';
}

async function currentUserId(locals: App.Locals): Promise<string> {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw redirect(303, '/login?next=%2F');
	}

	return user.id;
}

type ProviderConnections = Awaited<ReturnType<typeof listProviderConnections>>;
type ProviderLinesByConnection = Awaited<ReturnType<typeof listLatestProviderCostLines>>;
type PaygPanelData = {
	connections: ProviderConnections;
	linesByConnection: ProviderLinesByConnection;
	configured: boolean;
	error: string | null;
};

async function loadPaygPanelData(locals: App.Locals, userId: string): Promise<PaygPanelData> {
	const definitions = configuredProviderDefinitions();
	const configured = definitions.length > 0;

	if (!configured) {
		return {
			connections: [],
			linesByConnection: {},
			configured: false,
			error: null
		};
	}

	try {
		await ensureConfiguredProviderConnections(locals.supabase, userId, definitions);
		let connections = await listProviderConnections(locals.supabase);

		const cacheMinutes = cacheMinutesFromEnv();
		for (const connection of connections) {
			if (!isSnapshotFresh(connection.latest_fetched_at, cacheMinutes)) {
				try {
					await refreshProviderCost(locals.supabase, userId, connection.id);
				} catch {
					// The helper stores sync error metadata; keep old snapshot data visible.
				}
			}
		}

		connections = await listProviderConnections(locals.supabase);
		return {
			connections,
			linesByConnection: await listLatestProviderCostLines(
				locals.supabase,
				connections.map((connection) => connection.id)
			),
			configured,
			error: null
		};
	} catch (loadError) {
		return {
			connections: [],
			linesByConnection: {},
			configured,
			error: loadError instanceof Error ? loadError.message : 'Provider costs could not load.'
		};
	}
}

function secure(url: URL): boolean {
	return url.protocol === 'https:';
}

function safeReferrerPath(request: Request, currentUrl: URL): string {
	const referrer = request.headers.get('referer');
	if (!referrer) {
		return '/';
	}

	try {
		const target = new URL(referrer);
		if (target.origin !== currentUrl.origin) {
			return '/';
		}

		return safeRedirectPath(`${target.pathname}${target.search}${target.hash}`);
	} catch {
		return '/';
	}
}

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const tab = parseDashboardTab(url);
	const filters = parseDashboardFilters(url.searchParams);
	const flash = consumeFlash(cookies);
	const today = todayIso();
	const providerConfigured = isAnyProviderCostSyncConfigured();
	let paygData = Promise.resolve<PaygPanelData>({
		connections: [],
		linesByConnection: {},
		configured: providerConfigured,
		error: null
	});

	if (tab === 'payg') {
		const userId = await currentUserId(locals);
		paygData = loadPaygPanelData(locals, userId);
	}
	const filteredItemsPromise = hasDashboardFilters(filters)
		? listItemsForTable(locals.supabase, filters)
		: null;

	const [allItemRows, filteredItemRows, eventRows, burnRows, reminderRows, reminderCount] =
		await Promise.all([
			listItemsForTable(locals.supabase, {}),
			filteredItemsPromise,
			listUpcomingEvents(locals.supabase, 90),
			listBurn(locals.supabase),
			listDueReminders(locals.supabase, 3),
			countUnreadReminders(locals.supabase)
		]);

	const allItems = toDashboardItems(allItemRows);
	const items = toDashboardItems(filteredItemRows ?? allItemRows);
	const events = toDashboardEvents(eventRows);
	const burn = toDashboardBurn(burnRows);
	const { categories, providers } = getDistinctOptions(allItems);
	const { activeCount, upcoming30Count } = getDashboardSummary(allItems, events, today);

	let providerConnections: ProviderConnections = [];

	if (providerConfigured) {
		providerConnections = await listProviderConnections(locals.supabase);
	}

	return {
		tab,
		items,
		events,
		today,
		burn,
		paygSpend: toDashboardPaygSpend(providerConnections),
		activeCount,
		upcoming30Count,
		filters,
		categories,
		providers,
		reminders: reminderRows,
		reminderCount,
		providerConfigured,
		paygData,
		flash
	};
};

export const actions: Actions = {
	delete: async ({ locals, request, url, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');

		if (!uuidPattern.test(id)) {
			error(404, 'Not found');
		}

		await deleteItem(locals.supabase, id);
		setFlash(cookies, 'item_deleted', secure(url));
		throw redirect(303, safeReferrerPath(request, url));
	},
	refreshProviderCost: async ({ locals, request, url, cookies }) => {
		const formData = await request.formData();
		const connectionId = String(formData.get('connection_id') ?? '');

		if (!uuidPattern.test(connectionId)) {
			return fail(400, { error: 'Invalid provider connection.' });
		}

		try {
			await refreshProviderCost(locals.supabase, await currentUserId(locals), connectionId);
			setFlash(cookies, 'provider_refreshed', secure(url));
		} catch (providerError) {
			return fail(400, {
				error: providerError instanceof Error ? providerError.message : 'Provider refresh failed.'
			});
		}

		throw redirect(303, '/?tab=payg');
	},
	updateProviderBudget: async ({ locals, request, url, cookies }) => {
		const formData = await request.formData();
		const connectionId = String(formData.get('connection_id') ?? '');

		if (!uuidPattern.test(connectionId)) {
			return fail(400, { error: 'Invalid provider connection.' });
		}

		try {
			await updateProviderBudget(
				locals.supabase,
				connectionId,
				normalizeBudgetInput({
					monthly_budget: String(formData.get('monthly_budget') ?? ''),
					warning_remaining_amount: String(formData.get('warning_remaining_amount') ?? ''),
					critical_remaining_amount: String(formData.get('critical_remaining_amount') ?? '')
				})
			);
			setFlash(cookies, 'provider_budget_saved', secure(url));
		} catch (validationError) {
			return fail(400, {
				error:
					validationError instanceof Error ? validationError.message : 'Invalid budget settings.'
			});
		}

		throw redirect(303, '/?tab=payg');
	}
};
