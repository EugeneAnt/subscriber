import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createItem, deleteItem, getById, updateItem } from '../../src/lib/server/tracked-items';
import { createTestUser, deleteTestUser, signedInClient } from './helpers/supabase';

describe('tracked item CRUD helpers', () => {
	let userId: string;
	let supabase: Awaited<ReturnType<typeof signedInClient>>;

	beforeEach(async () => {
		const email = `crud-${crypto.randomUUID()}@test.local`;
		const user = await createTestUser(email);
		userId = user.id;
		supabase = await signedInClient(email);
	});

	afterEach(async () => {
		await deleteTestUser(userId);
	});

	test('creates and reads an item', async () => {
		const id = await createItem(supabase, {
			user_id: userId,
			name: 'Test',
			type: 'subscription',
			billing_cycle: 'monthly',
			billing_anchor_date: '2026-06-01',
			amount: 9.99,
			currency: 'USD'
		});

		const row = await getById(supabase, id);

		expect(row.id).toBe(id);
		expect(row.name).toBe('Test');
		expect(row.amount).toBe(9.99);
	});

	test('updates when the optimistic concurrency token matches', async () => {
		const id = await createItem(supabase, {
			user_id: userId,
			name: 'Old',
			type: 'subscription',
			billing_cycle: 'monthly',
			billing_anchor_date: '2026-06-01'
		});
		const row = await getById(supabase, id);

		const result = await updateItem(supabase, id, { name: 'New' }, row.updated_at);

		expect(result).toEqual({ status: 'ok' });
		await expect(getById(supabase, id)).resolves.toMatchObject({ name: 'New' });
	});

	test('returns conflict and leaves the row unchanged when the concurrency token is stale', async () => {
		const id = await createItem(supabase, {
			user_id: userId,
			name: 'Old',
			type: 'subscription',
			billing_cycle: 'monthly',
			billing_anchor_date: '2026-06-01'
		});

		const result = await updateItem(supabase, id, { name: 'New' }, '1990-01-01T00:00:00Z');

		expect(result).toEqual({ status: 'conflict' });
		await expect(getById(supabase, id)).resolves.toMatchObject({ name: 'Old' });
	});

	test('deletes an item and treats a repeated delete as success', async () => {
		const id = await createItem(supabase, {
			user_id: userId,
			name: 'To delete',
			type: 'subscription',
			billing_cycle: 'monthly',
			billing_anchor_date: '2026-06-01'
		});

		await deleteItem(supabase, id);
		await deleteItem(supabase, id);

		await expect(getById(supabase, id)).rejects.toThrow();
	});
});
