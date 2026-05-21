// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { env } from '$lib/server/env';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) {
          event.cookies.set(name, value, {
            ...options,
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: event.url.protocol === 'https:'
          });
        }
      }
    }
  });

  // Validate the JWT — don't trust getSession() alone.
  event.locals.safeGetSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession();
    if (!session) return { session: null, user: null };

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();
    if (error) return { session: null, user: null };

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range'
  });
};