import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	const origin = request.headers.get('origin');
	// SvelteKit has built-in CSRF checks for form posts in production; this endpoint keeps
	// its own same-origin guard so logout remains safe if global CSRF settings change.
	if (origin && origin !== url.origin) {
		error(403, 'Cross-site logout requests are forbidden.');
	}

	await locals.supabase.auth.signOut();
	throw redirect(303, '/login');
};
