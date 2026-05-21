import { fail, redirect } from '@sveltejs/kit';
import { safeRedirectPath } from '$lib/server/redirects';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (user) {
		throw redirect(303, safeRedirectPath(url.searchParams.get('next')));
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, error: 'Email and password are required.' });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });

		if (error) {
			const message =
				error.status === 429 ? 'Unable to sign in right now.' : 'Invalid email or password.';
			return fail(400, { email, error: message });
		}

		throw redirect(303, safeRedirectPath(url.searchParams.get('next')));
	}
};
