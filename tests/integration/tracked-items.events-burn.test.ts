import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { listBurn, listUpcomingEvents } from '../../src/lib/server/tracked-items';
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

describe('listUpcomingEvents', () => {
	let userId: string;
	let supabase: Awaited<ReturnType<typeof signedInClient>>;
	const createdUserIds: string[] = [];

	beforeEach(async () => {
		const email = `events-${crypto.randomUUID()}@test.local`;
		const user = await createTestUser(email);
		createdUserIds.push(user.id);
		userId = user.id;
		supabase = await signedInClient(email);
	});

	afterEach(async () => {
		await Promise.all(createdUserIds.splice(0).map((id) => deleteTestUser(id)));
	});

	test('returns one billing event and one expiry event for a hybrid item in the window', async () => {
		const eventDate = dateFromToday(30);

		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Hybrid domain',
				type: 'hybrid',
				billing_cycle: 'yearly',
				billing_anchor_date: eventDate,
				expiry_date: eventDate
			}
		]);

		const rows = await listUpcomingEvents(supabase, 90);

		expect(rows).toHaveLength(2);
		expect(rows.map((row) => row.event_kind).sort()).toEqual(['billing', 'expiry']);
		expect(rows.every((event) => event.name === 'Hybrid domain')).toBe(true);
	});

	test('excludes events outside the window and rows owned by another user', async () => {
		const otherUser = await createTestUser(`events-other-${crypto.randomUUID()}@test.local`);
		createdUserIds.push(otherUser.id);

		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Inside',
				type: 'expiry',
				expiry_date: dateFromToday(10)
			},
			{
				user_id: userId,
				name: 'Outside',
				type: 'expiry',
				expiry_date: dateFromToday(120)
			},
			{
				user_id: otherUser.id,
				name: 'Other user',
				type: 'expiry',
				expiry_date: dateFromToday(10)
			}
		]);

		const rows = await listUpcomingEvents(supabase, 90);

		expect(rows.map((row) => row.name)).toEqual(['Inside']);
	});
});

describe('listBurn', () => {
	let userId: string;
	let supabase: Awaited<ReturnType<typeof signedInClient>>;
	const createdUserIds: string[] = [];

	beforeEach(async () => {
		const email = `burn-${crypto.randomUUID()}@test.local`;
		const user = await createTestUser(email);
		createdUserIds.push(user.id);
		userId = user.id;
		supabase = await signedInClient(email);
	});

	afterEach(async () => {
		await Promise.all(createdUserIds.splice(0).map((id) => deleteTestUser(id)));
	});

	test('returns active subscription burn grouped by currency', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Monthly USD',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(1),
				amount: 10,
				currency: 'USD',
				status: 'active'
			},
			{
				user_id: userId,
				name: 'Yearly EUR',
				type: 'subscription',
				billing_cycle: 'yearly',
				billing_anchor_date: dateFromToday(1),
				amount: 120,
				currency: 'EUR',
				status: 'active'
			}
		]);

		const rows = await listBurn(supabase);
		const byCurrency = Object.fromEntries(
			rows.map((row) => [row.currency, Number(row.monthly_burn)])
		);

		expect(byCurrency).toEqual({ EUR: 10, USD: 10 });
	});

	test('excludes paused, cancelled, expiry-only, and other-user rows', async () => {
		const otherUser = await createTestUser(`burn-other-${crypto.randomUUID()}@test.local`);
		createdUserIds.push(otherUser.id);

		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Included',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(1),
				amount: 10,
				currency: 'USD',
				status: 'active'
			},
			{
				user_id: userId,
				name: 'Paused',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(1),
				amount: 20,
				currency: 'USD',
				status: 'paused'
			},
			{
				user_id: userId,
				name: 'Cancelled',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(1),
				amount: 30,
				currency: 'USD',
				status: 'cancelled'
			},
			{
				user_id: userId,
				name: 'Warranty',
				type: 'expiry',
				expiry_date: dateFromToday(30),
				amount: 40,
				currency: 'USD',
				status: 'active'
			},
			{
				user_id: otherUser.id,
				name: 'Other user',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(1),
				amount: 50,
				currency: 'USD',
				status: 'active'
			}
		]);

		const rows = await listBurn(supabase);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.currency).toBe('USD');
		expect(Number(rows[0]?.monthly_burn)).toBe(10);
	});
});
