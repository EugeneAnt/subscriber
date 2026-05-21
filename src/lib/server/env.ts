// src/lib/server/env.ts
import { env as privateEnv } from '$env/dynamic/private';

const SUPABASE_URL = privateEnv.SUPABASE_URL;
const SUPABASE_ANON_KEY = privateEnv.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL missing');
if (!SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY missing');

export const env = { SUPABASE_URL, SUPABASE_ANON_KEY };
