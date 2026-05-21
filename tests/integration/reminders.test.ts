import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	countUnreadReminders,
	dismissReminder,
	listDueReminders,
	markReminderRead,
	snoozeReminder
} from '../../src/lib/server/reminders';
import type { Database } from '../../src/lib/types/database';
import { admin, createTestUser, deleteTestUser, signedInClient } from './helpers/supabase';

type TrackedItemInsert = Database['public']['Tables']['tracked_items']['Insert'];

function dateFromToday(days: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + days);

	return date.toISOString().slice(0, 10);
}

async function insertTrackedItems(items: TrackedItemInsert[]): Promise<void> {
	const { error } = await admin.from('tracked_items').insert(items);

	if (error) {
		throw error;
	}
}

describe('reminder read helpers', () => {
	let userId: string;
	let supabase: Awaited<ReturnType<typeof signedInClient>>;
	const createdUserIds: string[] = [];

	beforeEach(async () => {
		const email = `reminders-${crypto.randomUUID()}@test.local`;
		const user = await createTestUser(email);
		createdUserIds.push(user.id);
		userId = user.id;
		supabase = await signedInClient(email);
	});

	afterEach(async () => {
		await Promise.all(createdUserIds.splice(0).map((id) => deleteTestUser(id)));
	});

	test('lists due visible billing reminders and filters computed is_visible through PostgREST', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Due in seven days',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(7),
				amount: 10,
				currency: 'USD'
			},
			{
				user_id: userId,
				name: 'Not due yet',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(20)
			},
			{
				user_id: userId,
				name: 'Expiry ignored',
				type: 'expiry',
				expiry_date: dateFromToday(7)
			}
		]);

		const rows = await listDueReminders(supabase);

		expect(rows.map((row) => row.name)).toEqual(['Due in seven days']);
		expect(rows[0]?.lead_days).toBe(7);
		expect(rows[0]?.is_visible).toBe(true);
		expect(rows[0]?.is_unread).toBe(true);
	});

	test('counts only unread due reminders', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Count me',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(7)
			}
		]);

		await expect(countUnreadReminders(supabase)).resolves.toBe(1);
	});

	test('marks a reminder read, dismisses it, and snoozes it by upserting state', async () => {
		const itemId = crypto.randomUUID();
		const eventDate = dateFromToday(7);
		const tomorrowItemId = crypto.randomUUID();
		const tomorrowEventDate = dateFromToday(1);
		await insertTrackedItems([
			{
				id: itemId,
				user_id: userId,
				name: 'Mutable reminder',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: eventDate
			},
			{
				id: tomorrowItemId,
				user_id: userId,
				name: 'Snoozable reminder',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: tomorrowEventDate
			}
		]);

		const key = {
			tracked_item_id: itemId,
			event_kind: 'billing' as const,
			event_date: eventDate,
			lead_days: 7 as const
		};

		await markReminderRead(supabase, userId, key);
		await expect(countUnreadReminders(supabase)).resolves.toBe(2);
		expect(
			(await listDueReminders(supabase)).find((row) => row.tracked_item_id === itemId)
				?.is_unread
		).toBe(false);

		await dismissReminder(supabase, userId, key);
		expect((await listDueReminders(supabase)).some((row) => row.tracked_item_id === itemId)).toBe(
			false
		);

		const tomorrowKey = {
			tracked_item_id: tomorrowItemId,
			event_kind: 'billing' as const,
			event_date: tomorrowEventDate,
			lead_days: 1 as const
		};

		expect(
			(await listDueReminders(supabase)).some(
				(row) => row.tracked_item_id === tomorrowItemId && row.lead_days === 1
			)
		).toBe(true);
		await snoozeReminder(supabase, userId, tomorrowKey, dateFromToday(1));
		expect(
			(await listDueReminders(supabase)).some(
				(row) => row.tracked_item_id === tomorrowItemId && row.lead_days === 1
			)
		).toBe(false);
		expect(
			(await listDueReminders(supabase)).some(
				(row) => row.tracked_item_id === tomorrowItemId && row.lead_days === 7
			)
		).toBe(true);
	});

	test('cross-user client cannot act on another user reminder', async () => {
		const otherEmail = `reminders-other-${crypto.randomUUID()}@test.local`;
		const otherUser = await createTestUser(otherEmail);
		createdUserIds.push(otherUser.id);
		const otherClient = await signedInClient(otherEmail);

		const itemId = crypto.randomUUID();
		const eventDate = dateFromToday(7);
		await insertTrackedItems([
			{
				id: itemId,
				user_id: userId,
				name: 'Cross-user reminder',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: eventDate
			}
		]);

		const key = {
			tracked_item_id: itemId,
			event_kind: 'billing' as const,
			event_date: eventDate,
			lead_days: 7 as const
		};

		await expect(markReminderRead(otherClient, userId, key)).rejects.toThrow(
			'Reminder source no longer exists'
		);
		await expect(countUnreadReminders(supabase)).resolves.toBe(1);
	});
});
