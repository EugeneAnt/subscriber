import { fail, redirect } from '@sveltejs/kit';

import { consumeFlash, setFlash } from '$lib/server/flash';
import {
	dismissReminder,
	listDueReminders,
	markReminderRead,
	parseReminderKey,
	snoozeReminder,
	tomorrowUtcIso
} from '$lib/server/reminders';
import type { Actions, PageServerLoad } from './$types';

async function currentUserId(locals: App.Locals): Promise<string> {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw redirect(303, '/login?next=%2Freminders');
	}

	return user.id;
}

function secure(url: URL): boolean {
	return url.protocol === 'https:';
}

async function readKey(request: Request) {
	try {
		return parseReminderKey(await request.formData());
	} catch {
		return null;
	}
}

function isStaleReminderError(error: unknown): boolean {
	return error instanceof Error && error.message === 'Reminder source no longer exists';
}

export const load: PageServerLoad = async ({ cookies, locals }) => {
	return {
		reminders: await listDueReminders(locals.supabase),
		flash: consumeFlash(cookies)
	};
};

export const actions: Actions = {
	read: async ({ locals, request, url, cookies }) => {
		const key = await readKey(request);
		if (!key) return fail(400, { message: 'Invalid reminder key' });

		try {
			await markReminderRead(locals.supabase, await currentUserId(locals), key);
			setFlash(cookies, 'reminder_read', secure(url));
		} catch (error) {
			if (!isStaleReminderError(error)) throw error;
			setFlash(cookies, 'reminder_stale', secure(url));
		}

		throw redirect(303, '/reminders');
	},
	snooze: async ({ locals, request, url, cookies }) => {
		const key = await readKey(request);
		if (!key) return fail(400, { message: 'Invalid reminder key' });

		try {
			await snoozeReminder(locals.supabase, await currentUserId(locals), key, tomorrowUtcIso());
			setFlash(cookies, 'reminder_snoozed', secure(url));
		} catch (error) {
			if (!isStaleReminderError(error)) throw error;
			setFlash(cookies, 'reminder_stale', secure(url));
		}

		throw redirect(303, '/reminders');
	},
	dismiss: async ({ locals, request, url, cookies }) => {
		const key = await readKey(request);
		if (!key) return fail(400, { message: 'Invalid reminder key' });

		try {
			await dismissReminder(locals.supabase, await currentUserId(locals), key);
			setFlash(cookies, 'reminder_dismissed', secure(url));
		} catch (error) {
			if (!isStaleReminderError(error)) throw error;
			setFlash(cookies, 'reminder_stale', secure(url));
		}

		throw redirect(303, '/reminders');
	}
};
