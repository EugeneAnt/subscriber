<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { formatEventTimingLabel } from '$lib/date-labels';
	import type { DashboardEvent } from '$lib/types/dashboard';

	import EmptyState from './EmptyState.svelte';

	type Props = {
		events: DashboardEvent[];
		today: string;
	};

	let { events, today }: Props = $props();

	function formatDate(date: string): string {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${date}T00:00:00.000Z`));
	}

	function formatAmount(amount: number | null, currency: string | null): string | null {
		if (amount === null || currency === null) {
			return null;
		}

		return `${amount.toFixed(2)} ${currency}`;
	}
</script>

<section aria-labelledby="upcoming-heading" class="space-y-3">
	<h2 id="upcoming-heading" class="text-lg font-semibold">Upcoming events</h2>

	{#if events.length === 0}
		<EmptyState title="No upcoming events" body="Nothing renews or expires in the next 90 days." />
	{:else}
		<ul class="divide-y rounded-lg border bg-card">
			{#each events as event (`${event.tracked_item_id}-${event.event_kind}-${event.event_date}`)}
				<li class="flex min-h-16 items-center justify-between gap-3 p-3">
					<div class="min-w-0">
						<a
							class="block truncate font-medium hover:underline"
							href={resolve('/(app)/items/[id]', { id: event.tracked_item_id })}
						>
							{event.name}
						</a>
						<p class="text-sm text-muted-foreground">
							{formatDate(event.event_date)} · {formatEventTimingLabel(
								event.event_kind,
								event.event_date,
								today
							)}
						</p>
					</div>

					<div class="flex shrink-0 items-center gap-2">
						{#if formatAmount(event.amount, event.currency)}
							<span class="text-sm tabular-nums">{formatAmount(event.amount, event.currency)}</span>
						{/if}
						<Badge variant={event.event_kind === 'expiry' ? 'destructive' : 'secondary'}>
							{event.event_kind}
						</Badge>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
