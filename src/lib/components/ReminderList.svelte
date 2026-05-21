<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { ReminderRow } from '$lib/server/reminders';

	import EmptyState from './EmptyState.svelte';
	import ReminderActions from './ReminderActions.svelte';

	type Props = {
		reminders: ReminderRow[];
		emptyTitle?: string;
		emptyBody?: string;
		compact?: boolean;
		actionBase?: string;
	};

	let {
		reminders,
		emptyTitle = 'No reminders due',
		emptyBody = 'Payment reminders will appear 7 days and 1 day before upcoming billing dates.',
		compact = false,
		actionBase = '/reminders'
	}: Props = $props();

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

{#if reminders.length === 0}
	<EmptyState title={emptyTitle} body={emptyBody} />
{:else}
	<ul class="divide-y rounded-lg border bg-card">
		{#each reminders as reminder (`${reminder.tracked_item_id}-${reminder.event_kind}-${reminder.event_date}-${reminder.lead_days}`)}
			{@const amount = formatAmount(reminder.amount, reminder.currency)}
			<li class="space-y-3 p-3">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0 space-y-1">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="truncate font-medium">{reminder.name}</h3>
							{#if reminder.is_unread}
								<Badge variant="destructive">Unread</Badge>
							{:else}
								<Badge variant="secondary">Read</Badge>
							{/if}
						</div>
						<p class="text-sm text-muted-foreground">
							Billing on {formatDate(reminder.event_date)} · {reminder.lead_days}
							{reminder.lead_days === 1 ? 'day' : 'days'} before
						</p>
						{#if reminder.category || reminder.provider || amount}
							<p class="text-sm text-muted-foreground">
								{#if amount}
									<span>{amount}</span>
								{/if}
								{#if reminder.provider}
									<span>{amount ? ' · ' : ''}{reminder.provider}</span>
								{/if}
								{#if reminder.category}
									<span>{reminder.provider || amount ? ' · ' : ''}{reminder.category}</span>
								{/if}
							</p>
						{/if}
					</div>
				</div>

				<ReminderActions {reminder} {compact} {actionBase} />
			</li>
		{/each}
	</ul>
{/if}
