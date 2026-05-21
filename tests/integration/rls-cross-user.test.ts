import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createItem, deleteItem, getById, updateItem } from '../../src/lib/server/tracked-items';
import { createTestUser, deleteTestUser, signedInClient } from './helpers/supabase';

describe('RLS cross-user behavior through query helpers', () => {
	const createdUserIds: string[] = [];
	let userAId: string;
	let clientA: Awaited<ReturnType<typeof signedInClient>>;
	let clientB: Awaited<ReturnType<typeof signedInClient>>;

	beforeEach(async () => {
		const emailA = `rls-a-${crypto.randomUUID()}@test.local`;
		const emailB = `rls-b-${crypto.randomUUID()}@test.local`;

		const userA = await createTestUser(emailA);
		const userB = await createTestUser(emailB);
		createdUserIds.push(userA.id, userB.id);

		userAId = userA.id;
		clientA = await signedInClient(emailA);
		clientB = await signedInClient(emailB);
	});

	afterEach(async () => {
		await Promise.all(createdUserIds.splice(0).map((id) => deleteTestUser(id)));
	});

	test("user B cannot read, update, or delete user A's row", async () => {
		const id = await createItem(clientA, {
			user_id: userAId,
			name: 'A item',
			type: 'subscription',
			billing_cycle: 'monthly',
			billing_anchor_date: '2026-06-01'
		});
		const rowA = await getById(clientA, id);

		await expect(getById(clientB, id)).rejects.toThrow();
		await expect(updateItem(clientB, id, { name: 'B edit' }, rowA.updated_at)).resolves.toEqual({
			status: 'conflict'
		});
		await deleteItem(clientB, id);

		await expect(getById(clientA, id)).resolves.toMatchObject({ name: 'A item' });
	});

	test("user B cannot insert a row owned by user A's user_id", async () => {
		await expect(
			createItem(clientB, {
				user_id: userAId,
				name: 'B impersonates A',
				type: 'subscription',
				billing_cycle: 'monthly',
				billing_anchor_date: '2026-06-01'
			})
		).rejects.toThrow();
	});
});
