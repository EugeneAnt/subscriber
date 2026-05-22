type EventKind = 'billing' | 'expiry';

const msPerDay = 24 * 60 * 60 * 1000;

function utcDateMs(date: string): number {
	const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
	return Date.UTC(year, month - 1, day);
}

function daysBetween(today: string, target: string): number {
	return Math.round((utcDateMs(target) - utcDateMs(today)) / msPerDay);
}

export function formatEventTimingLabel(
	eventKind: EventKind,
	eventDate: string,
	today: string
): string {
	const days = daysBetween(today, eventDate);
	const verb = eventKind === 'expiry' ? 'Expires' : 'Due';

	if (days === 0) {
		return `${verb} today`;
	}

	if (days > 0) {
		return `${verb} in ${days} ${days === 1 ? 'day' : 'days'}`;
	}

	const daysAgo = Math.abs(days);
	return `${verb} ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
}
