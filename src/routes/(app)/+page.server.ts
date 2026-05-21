import { error, redirect } from '@sveltejs/kit';
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
import { consumeFlash, setFlash } from '$lib/server/flash';
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
	const filters = parseDashboardFilters(url.searchParams);
	const flash = consumeFlash(cookies);
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
	const { activeCount, upcoming30Count } = getDashboardSummary(allItems, events, todayIso());

	return {
		items,
		events,
		burn,
		activeCount,
		upcoming30Count,
		filters,
		categories,
		providers,
		reminders: reminderRows,
		reminderCount,
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
		setFlash(cookies, 'item_deleted', url.protocol === 'https:');
		throw redirect(303, safeReferrerPath(request, url));
	}
};
