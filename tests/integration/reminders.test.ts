import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { countUnreadReminders, listDueReminders } from '../../src/lib/server/reminders';
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
});
