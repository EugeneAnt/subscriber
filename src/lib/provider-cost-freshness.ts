export type ProviderCostRefreshState = {
	latest_fetched_at?: string | null;
	last_sync_started_at?: string | null;
	last_sync_finished_at?: string | null;
};

export function isTimestampFresh(
	value: string | null | undefined,
	cacheMinutes: number,
	now = new Date()
): boolean {
	if (!value) return false;

	const timestamp = new Date(value).getTime();
	if (Number.isNaN(timestamp)) return false;

	return now.getTime() - timestamp < cacheMinutes * 60_000;
}

export function shouldAutoRefreshProviderCost(
	connection: ProviderCostRefreshState,
	cacheMinutes: number,
	now = new Date()
): boolean {
	if (isTimestampFresh(connection.latest_fetched_at, cacheMinutes, now)) {
		return false;
	}

	const latestAttempt = connection.last_sync_finished_at ?? connection.last_sync_started_at ?? null;
	return !isTimestampFresh(latestAttempt, cacheMinutes, now);
}
