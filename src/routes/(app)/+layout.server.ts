import { error, redirect } from '@sveltejs/kit';

import { countUnreadReminders } from '$lib/server/reminders';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, setHeaders, url }) => {
	setHeaders({
		'cache-control': 'private, no-store, max-age=0'
	});

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

	const reminderCount = await countUnreadReminders(locals.supabase);

	return {
		user: { id: user.id, email: user.email ?? null },
		reminderCount
	};
};
