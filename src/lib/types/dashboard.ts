import type { Database } from './database';

type TrackedItemTableRow = Database['public']['Views']['tracked_items_v']['Row'];
type TrackedItemEventRow = Database['public']['Views']['tracked_item_events_v']['Row'];
type TrackedItemType = Database['public']['Enums']['tracked_item_type'];
type StoredStatus = Database['public']['Enums']['tracked_item_status'];

export type DashboardFilters = {
	type?: TrackedItemType;
	status?: StoredStatus | 'expired';
	category?: string;
	provider?: string;
};

export type DashboardItem = Omit<
	TrackedItemTableRow,
	'id' | 'name' | 'type' | 'effective_status'
> & {
	id: string;
	name: string;
	type: TrackedItemType;
	effective_status: StoredStatus | 'expired';
};

export type DashboardEvent = Omit<
	TrackedItemEventRow,
	'tracked_item_id' | 'name' | 'event_kind' | 'event_date'
> & {
	tracked_item_id: string;
	name: string;
	event_kind: 'billing' | 'expiry';
	event_date: string;
};

export type DashboardBurn = {
	currency: string;
	monthly_burn: number;
};
