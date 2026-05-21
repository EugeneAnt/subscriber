import { createClient, type User } from '@supabase/supabase-js';

import type { Database } from '../../../src/lib/types/database';

type TrackedItemInsert = Database['public']['Tables']['tracked_items']['Insert'];

export type E2EUser = {
	id: string;
	email: string;
	password: string;
};

export const TEST_PASSWORD = 'TestPassword123!';

function requiredEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} required. Set it from \`supabase start\` output.`);
	}

	return value;
}

const SUPABASE_URL = requiredEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = requiredEnv('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

export const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		detectSessionInUrl: false,
		persistSession: false
	}
});

export const anon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: false,
		detectSessionInUrl: false,
		persistSession: false
	}
});

function userFromAuth(user: User, email: string, password: string): E2EUser {
	return {
		id: user.id,
		email,
		password
	};
}

export async function createE2EUser(): Promise<E2EUser> {
	const email = `e2e-${crypto.randomUUID()}@example.test`;
	const { data, error } = await admin.auth.admin.createUser({
		email,
		password: TEST_PASSWORD,
		email_confirm: true
	});

	if (error) {
		throw error;
	}

	if (!data.user) {
		throw new Error('Supabase did not return a user after creating an E2E account.');
	}

	return userFromAuth(data.user, email, TEST_PASSWORD);
}

export async function deleteE2EUser(userId: string): Promise<void> {
	const { error } = await admin.auth.admin.deleteUser(userId);

	if (error) {
		throw error;
	}
}

export async function createE2EItem(
	userId: string,
	patch: Partial<TrackedItemInsert> = {}
): Promise<string> {
	const input: TrackedItemInsert = {
		user_id: userId,
		name: `E2E Item ${crypto.randomUUID()}`,
		type: 'subscription',
		billing_cycle: 'monthly',
		billing_anchor_date: '2026-06-01',
		status: 'active',
		...patch
	};

	const { data, error } = await admin.from('tracked_items').insert(input).select('id').single();

	if (error) {
		throw error;
	}

	return data.id;
}
