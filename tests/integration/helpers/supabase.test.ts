import { describe, expect, test } from 'vitest';
import { createTestUser, deleteTestUser, signedInClient } from './supabase';

describe('Supabase integration helpers', () => {
	test('creates a confirmed user and returns a client signed in as that user', async () => {
		const email = `helper-${crypto.randomUUID()}@test.local`;
		const user = await createTestUser(email);

		try {
			const supabase = await signedInClient(email);
			const {
				data: { user: signedInUser },
				error
			} = await supabase.auth.getUser();

			expect(error).toBeNull();
			expect(signedInUser?.id).toBe(user.id);
			expect(signedInUser?.email).toBe(email);
		} finally {
			await deleteTestUser(user.id);
		}
	});
});
