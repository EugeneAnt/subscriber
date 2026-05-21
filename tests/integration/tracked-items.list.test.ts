import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { listItemsForTable } from '../../src/lib/server/tracked-items';
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

describe('listItemsForTable', () => {
	let userId: string;
	let supabase: Awaited<ReturnType<typeof signedInClient>>;
	const createdUserIds: string[] = [];

	beforeEach(async () => {
		const email = `list-${crypto.randomUUID()}@test.local`;

		const user = await createTestUser(email);
		createdUserIds.push(user.id);
		userId = user.id;
		supabase = await signedInClient(email);
	});

	afterEach(async () => {
		await Promise.all(createdUserIds.splice(0).map((id) => deleteTestUser(id)));
	});

	test('returns calling-user rows ordered by effective billing date, then expiry date', async () => {
		const otherUser = await createTestUser(`list-other-${crypto.randomUUID()}@test.local`);
		createdUserIds.push(otherUser.id);

		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Later subscription',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(20)
			},
			{
				user_id: userId,
				name: 'Soon subscription',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(5)
			},
			{
				user_id: userId,
				name: 'Expiry only',
				type: 'expiry',
				expiry_date: dateFromToday(1)
			},
			{
				user_id: otherUser.id,
				name: 'Other user subscription',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(1)
			}
		]);

		const rows = await listItemsForTable(supabase, {});

		expect(rows.map((row) => row.name)).toEqual([
			'Soon subscription',
			'Later subscription',
			'Expiry only'
		]);
	});

	test('filters by type', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Subscription',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(5)
			},
			{
				user_id: userId,
				name: 'Expiry',
				type: 'expiry',
				expiry_date: dateFromToday(10)
			}
		]);

		const rows = await listItemsForTable(supabase, { type: 'expiry' });

		expect(rows.map((row) => row.name)).toEqual(['Expiry']);
	});

	test('filters by effective status', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Active',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(5),
				status: 'active'
			},
			{
				user_id: userId,
				name: 'Paused',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(5),
				status: 'paused'
			}
		]);

		const rows = await listItemsForTable(supabase, { status: 'paused' });

		expect(rows.map((row) => row.name)).toEqual(['Paused']);
	});

	test('filters by computed expired status', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'Expired warranty',
				type: 'expiry',
				expiry_date: dateFromToday(-1),
				status: 'active'
			},
			{
				user_id: userId,
				name: 'Future warranty',
				type: 'expiry',
				expiry_date: dateFromToday(10),
				status: 'active'
			}
		]);

		const rows = await listItemsForTable(supabase, { status: 'expired' });

		expect(rows.map((row) => row.name)).toEqual(['Expired warranty']);
	});

	test('filters by category and provider', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'OpenAI',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(5),
				category: 'AI',
				provider: 'OpenAI'
			},
			{
				user_id: userId,
				name: 'Anthropic',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(5),
				category: 'AI',
				provider: 'Anthropic'
			},
			{
				user_id: userId,
				name: 'Domain',
				type: 'expiry',
				expiry_date: dateFromToday(10),
				category: 'Domains',
				provider: 'Registrar'
			}
		]);

		const rows = await listItemsForTable(supabase, {
			category: 'AI',
			provider: 'OpenAI'
		});

		expect(rows.map((row) => row.name)).toEqual(['OpenAI']);
	});

	test('returns an empty array when no rows match', async () => {
		await insertTrackedItems([
			{
				user_id: userId,
				name: 'OpenAI',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: dateFromToday(5),
				category: 'AI',
				provider: 'OpenAI'
			}
		]);

		await expect(listItemsForTable(supabase, { category: 'Domains' })).resolves.toEqual([]);
	});
});
