import {
	getDashboardSummary,
	getDistinctOptions,
	hasDashboardFilters,
	parseDashboardFilters,
	toDashboardBurn,
	toDashboardEvents,
	toDashboardItems,
	todayIso
} from '$lib/server/dashboard';
import { listBurn, listItemsForTable, listUpcomingEvents } from '$lib/server/tracked-items';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const filters = parseDashboardFilters(url.searchParams);
	const filteredItemsPromise = hasDashboardFilters(filters)
		? listItemsForTable(locals.supabase, filters)
		: null;

	const [allItemRows, filteredItemRows, eventRows, burnRows] = await Promise.all([
		listItemsForTable(locals.supabase, {}),
		filteredItemsPromise,
		listUpcomingEvents(locals.supabase, 90),
		listBurn(locals.supabase)
	]);

	const allItems = toDashboardItems(allItemRows);
	const items = toDashboardItems(filteredItemRows ?? allItemRows);
	const events = toDashboardEvents(eventRows);
	const burn = toDashboardBurn(burnRows);
	const { categories, providers } = getDistinctOptions(allItems);
	const { activeCount, upcoming30Count } = getDashboardSummary(allItems, events, todayIso());

	return {
		items,
		events,
		burn,
		activeCount,
		upcoming30Count,
		filters,
		categories,
		providers
	};
};
