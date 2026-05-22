import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '$lib/types/database';
import { isUuid } from './ids';

type Client = Pick<SupabaseClient<Database>, 'from'>;
type ReminderStateInsert = Database['public']['Tables']['reminder_states']['Insert'];
type ReminderStateUpdate = Database['public']['Tables']['reminder_states']['Update'];
type ReminderViewRow = Database['public']['Views']['tracked_item_reminders_v']['Row'];

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const allowedLeadDays = new Set([1, 7]);

export type ReminderKey = {
	tracked_item_id: string;
	event_kind: 'billing';
	event_date: string;
	lead_days: 1 | 7;
};

export type ReminderRow = ReminderViewRow & {
	tracked_item_id: string;
	name: string;
	event_kind: 'billing';
	event_date: string;
	lead_days: 1 | 7;
	reminder_due_date: string;
	is_visible: boolean;
	is_unread: boolean;
};

function formValue(formData: FormData, name: string): string {
	return String(formData.get(name) ?? '');
}

function isValidIsoDate(value: string): boolean {
	if (!isoDatePattern.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00.000Z`);

	if (Number.isNaN(date.getTime())) {
		return false;
	}

	return (
		date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '2100-12-31'
	);
}

export function parseReminderKey(formData: FormData): ReminderKey {
	const tracked_item_id = formValue(formData, 'tracked_item_id');
	const event_kind = formValue(formData, 'event_kind');
	const event_date = formValue(formData, 'event_date');
	const leadDaysValue = Number(formValue(formData, 'lead_days'));

	if (
		!isUuid(tracked_item_id) ||
		event_kind !== 'billing' ||
		!isValidIsoDate(event_date) ||
		!allowedLeadDays.has(leadDaysValue)
	) {
		throw new Error('Invalid reminder key');
	}

	return {
		tracked_item_id,
		event_kind,
		event_date,
		lead_days: leadDaysValue as 1 | 7
	};
}

export function tomorrowUtcIso(now = new Date()): string {
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	date.setUTCDate(date.getUTCDate() + 1);

	return date.toISOString().slice(0, 10);
}

export function isReminderRow(row: ReminderViewRow): row is ReminderRow {
	return (
		typeof row.tracked_item_id === 'string' &&
		typeof row.name === 'string' &&
		row.event_kind === 'billing' &&
		typeof row.event_date === 'string' &&
		(row.lead_days === 1 || row.lead_days === 7) &&
		typeof row.reminder_due_date === 'string' &&
		typeof row.is_visible === 'boolean' &&
		typeof row.is_unread === 'boolean'
	);
}

export async function assertReminderSourceExists(
	supabase: Client,
	key: ReminderKey
): Promise<boolean> {
	const { data, error } = await supabase
		.from('tracked_item_reminders_v')
		.select('tracked_item_id')
		.eq('tracked_item_id', key.tracked_item_id)
		.eq('event_kind', key.event_kind)
		.eq('event_date', key.event_date)
		.eq('lead_days', key.lead_days)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data !== null;
}

export function stateInsert(userId: string, key: ReminderKey): ReminderStateInsert {
	return {
		user_id: userId,
		tracked_item_id: key.tracked_item_id,
		event_kind: key.event_kind,
		event_date: key.event_date,
		lead_days: key.lead_days
	};
}

export function stateUpdate(patch: ReminderStateUpdate): ReminderStateUpdate {
	return patch;
}

export async function listDueReminders(supabase: Client, limit?: number): Promise<ReminderRow[]> {
	let query = supabase
		.from('tracked_item_reminders_v')
		.select('*')
		.eq('is_visible', true)
		.order('event_date', { ascending: true, nullsFirst: false })
		.order('lead_days', { ascending: true, nullsFirst: false })
		.order('name', { ascending: true, nullsFirst: false });

	if (limit !== undefined) {
		query = query.limit(limit);
	}

	const { data, error } = await query;

	if (error) {
		throw error;
	}

	return (data ?? []).filter(isReminderRow);
}

export async function countUnreadReminders(supabase: Client): Promise<number> {
	const { count, error } = await supabase
		.from('tracked_item_reminders_v')
		.select('tracked_item_id', { count: 'exact', head: true })
		.eq('is_unread', true);

	if (error) {
		throw error;
	}

	return count ?? 0;
}

async function upsertReminderState(
	supabase: Client,
	userId: string,
	key: ReminderKey,
	patch: ReminderStateUpdate
): Promise<void> {
	const sourceExists = await assertReminderSourceExists(supabase, key);
	if (!sourceExists) {
		throw new Error('Reminder source no longer exists');
	}

	const { error } = await supabase.from('reminder_states').upsert(
		{
			...stateInsert(userId, key),
			...stateUpdate(patch)
		},
		{ onConflict: 'user_id,tracked_item_id,event_kind,event_date,lead_days' }
	);

	if (error) {
		throw error;
	}
}

export async function markReminderRead(
	supabase: Client,
	userId: string,
	key: ReminderKey
): Promise<void> {
	await upsertReminderState(supabase, userId, key, {
		read_at: new Date().toISOString()
	});
}

export async function dismissReminder(
	supabase: Client,
	userId: string,
	key: ReminderKey
): Promise<void> {
	await upsertReminderState(supabase, userId, key, {
		read_at: new Date().toISOString(),
		dismissed_at: new Date().toISOString(),
		snoozed_until: null
	});
}

export async function snoozeReminder(
	supabase: Client,
	userId: string,
	key: ReminderKey,
	untilDate: string
): Promise<void> {
	if (!isValidIsoDate(untilDate)) {
		throw new Error('Invalid snooze date');
	}

	await upsertReminderState(supabase, userId, key, {
		read_at: new Date().toISOString(),
		dismissed_at: null,
		snoozed_until: untilDate
	});
}
