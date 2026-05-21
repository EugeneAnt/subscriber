import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '$lib/types/database';

type Client = Pick<SupabaseClient<Database>, 'from'>;
type TrackedItemInsert = Database['public']['Tables']['tracked_items']['Insert'];
type TrackedItemRow = Database['public']['Tables']['tracked_items']['Row'];
type TrackedItemUpdate = Database['public']['Tables']['tracked_items']['Update'];
type TrackedItemType = Database['public']['Enums']['tracked_item_type'];
type UpdatedAtToken = TrackedItemRow['updated_at'];
type StoredStatus = Database['public']['Enums']['tracked_item_status'];

export type ItemFilters = {
	type?: TrackedItemType;
	status?: StoredStatus | 'expired';
	category?: string;
	provider?: string;
};

export type TrackedItemTableRow = Database['public']['Views']['tracked_items_v']['Row'];
export type TrackedItemEventRow = Database['public']['Views']['tracked_item_events_v']['Row'];
export type TrackedItemBurnRow = Database['public']['Views']['tracked_items_burn_v']['Row'];
export type UpdateResult = { status: 'ok' } | { status: 'conflict' };

// Single-row helpers intentionally throw PostgREST errors for not-found/RLS-hidden rows.
// Route actions map those errors to 404/form failures at the SvelteKit boundary.

function dateFromToday(days: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + days);

	return date.toISOString().slice(0, 10);
}

export async function listItemsForTable(
	supabase: Client,
	filters: ItemFilters
): Promise<TrackedItemTableRow[]> {
	let query = supabase
		.from('tracked_items_v')
		.select('*')
		.order('effective_next_date', { ascending: true, nullsFirst: false })
		.order('expiry_date', { ascending: true, nullsFirst: false })
		.order('name', { ascending: true, nullsFirst: false });

	if (filters.type) {
		query = query.eq('type', filters.type);
	}

	if (filters.status) {
		query = query.eq('effective_status', filters.status);
	}

	if (filters.category) {
		query = query.eq('category', filters.category);
	}

	if (filters.provider) {
		query = query.eq('provider', filters.provider);
	}

	const { data, error } = await query;

	if (error) {
		throw error;
	}

	return data ?? [];
}

export async function listUpcomingEvents(
	supabase: Client,
	days = 90
): Promise<TrackedItemEventRow[]> {
	const { data, error } = await supabase
		.from('tracked_item_events_v')
		.select('*')
		.gte('event_date', dateFromToday(0))
		.lte('event_date', dateFromToday(days))
		.order('event_date', { ascending: true, nullsFirst: false })
		.order('event_kind', { ascending: true, nullsFirst: false })
		.order('name', { ascending: true, nullsFirst: false });

	if (error) {
		throw error;
	}

	return data ?? [];
}

export async function listBurn(supabase: Client): Promise<TrackedItemBurnRow[]> {
	const { data, error } = await supabase
		.from('tracked_items_burn_v')
		.select('*')
		.order('currency', { ascending: true, nullsFirst: false });

	if (error) {
		throw error;
	}

	return data ?? [];
}

export async function getById(supabase: Client, id: string): Promise<TrackedItemRow> {
	const { data, error } = await supabase.from('tracked_items').select('*').eq('id', id).single();

	if (error) {
		throw error;
	}

	return data;
}

export async function createItem(supabase: Client, input: TrackedItemInsert): Promise<string> {
	const { data, error } = await supabase.from('tracked_items').insert(input).select('id').single();

	if (error) {
		throw error;
	}

	return data.id;
}

export async function updateItem(
	supabase: Client,
	id: string,
	patch: TrackedItemUpdate,
	updatedAtToken: UpdatedAtToken
): Promise<UpdateResult> {
	const { data, error } = await supabase
		.from('tracked_items')
		.update(patch)
		.eq('id', id)
		.eq('updated_at', updatedAtToken)
		.select('id');

	if (error) {
		throw error;
	}

	return data.length === 0 ? { status: 'conflict' } : { status: 'ok' };
}

export async function deleteItem(supabase: Client, id: string): Promise<void> {
	const { error } = await supabase.from('tracked_items').delete().eq('id', id);

	if (error) {
		throw error;
	}
}
