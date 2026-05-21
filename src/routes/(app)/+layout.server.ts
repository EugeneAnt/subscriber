import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let user;
	try {
		({ user } = await locals.safeGetSession());
	} catch {
		error(503, 'Authentication service unavailable.');
	}

	if (!user) {
		const next = url.pathname + url.search;
		throw redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	return {
		user: { id: user.id, email: user.email ?? null }
	};
};
