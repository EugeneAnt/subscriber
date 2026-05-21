// src/lib/server/env.ts
import { env as privateEnv } from '$env/dynamic/private';

const SUPABASE_URL = privateEnv.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
	privateEnv.SUPABASE_PUBLISHABLE_KEY ?? privateEnv.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL missing');
if (!SUPABASE_PUBLISHABLE_KEY) {
	throw new Error('SUPABASE_PUBLISHABLE_KEY missing; legacy SUPABASE_ANON_KEY is also accepted');
}

export const env = { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
