import type { Cookies } from '@sveltejs/kit';

const flashCookieName = 'subscriber_flash';

const flashMessages = {
	item_created: 'Item created',
	item_saved: 'Item saved',
	item_deleted: 'Item deleted',
	reminder_read: 'Reminder marked read',
	reminder_snoozed: 'Reminder snoozed',
	reminder_dismissed: 'Reminder dismissed',
	reminder_stale: 'Reminder is no longer current'
} as const;

export type FlashKind = keyof typeof flashMessages;

export type FlashMessage = {
	type: 'success';
	message: string;
};

export function setFlash(cookies: Cookies, kind: FlashKind, secure: boolean): void {
	cookies.set(flashCookieName, kind, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 60
	});
}

export function consumeFlash(cookies: Cookies): FlashMessage | null {
	const kind = cookies.get(flashCookieName);
	cookies.delete(flashCookieName, { path: '/' });

	if (!kind || !(kind in flashMessages)) {
		return null;
	}

	return {
		type: 'success',
		message: flashMessages[kind as FlashKind]
	};
}
