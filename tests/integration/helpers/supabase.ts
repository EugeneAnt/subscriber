import { createClient, type User } from '@supabase/supabase-js';

import type { Database } from '../../../src/lib/types/database';

type DatabaseClient = ReturnType<typeof createClient<Database>>;

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
const TEST_PASSWORD = 'TestPassword123!';

export const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		detectSessionInUrl: false,
		persistSession: false
	}
});

// Keep sign-in on the anon key path so helper clients behave like real users.
const authClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: false,
		detectSessionInUrl: false,
		persistSession: false
	}
});

export function userClient(jwt: string): DatabaseClient {
	return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
		// Supabase-js uses this bearer token for PostgREST calls while auth state stays disabled.
		global: {
			headers: {
				Authorization: `Bearer ${jwt}`
			}
		},
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false
		}
	});
}

export async function createTestUser(email: string, password = TEST_PASSWORD): Promise<User> {
	const { data, error } = await admin.auth.admin.createUser({
		email,
		password,
		email_confirm: true
	});

	if (error) {
		throw error;
	}

	if (!data.user) {
		throw new Error('Supabase did not return a user after creating a test account.');
	}

	return data.user;
}

export async function deleteTestUser(id: string): Promise<void> {
	const { error } = await admin.auth.admin.deleteUser(id);

	if (error) {
		throw error;
	}
}

export async function signedInClient(
	email: string,
	password = TEST_PASSWORD
): Promise<DatabaseClient> {
	const { data, error } = await authClient.auth.signInWithPassword({ email, password });

	if (error) {
		throw error;
	}

	if (!data.session) {
		throw new Error('Supabase did not return a session after signing in a test account.');
	}

	return userClient(data.session.access_token);
}
