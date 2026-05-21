<script lang="ts">
	import { resolve } from '$app/paths';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import XIcon from '@lucide/svelte/icons/x';

	import { Button } from '$lib/components/ui/button';
	import type { ReminderRow } from '$lib/server/reminders';

	type Props = {
		reminder: ReminderRow;
		compact?: boolean;
		actionBase?: string;
	};

	let { reminder, compact = false, actionBase = '/reminders' }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	<Button
		href={resolve('/(app)/items/[id]', { id: reminder.tracked_item_id })}
		variant="outline"
		size={compact ? 'sm' : 'default'}
		class="min-h-11"
	>
		<ExternalLinkIcon />
		Open item
	</Button>

	<form method="POST" action={`${actionBase}?/read`}>
		<input type="hidden" name="tracked_item_id" value={reminder.tracked_item_id} />
		<input type="hidden" name="event_kind" value={reminder.event_kind} />
		<input type="hidden" name="event_date" value={reminder.event_date} />
		<input type="hidden" name="lead_days" value={reminder.lead_days} />
		<Button variant="secondary" size={compact ? 'sm' : 'default'} class="min-h-11">
			<CheckIcon />
			Mark read
		</Button>
	</form>

	<form method="POST" action={`${actionBase}?/snooze`}>
		<input type="hidden" name="tracked_item_id" value={reminder.tracked_item_id} />
		<input type="hidden" name="event_kind" value={reminder.event_kind} />
		<input type="hidden" name="event_date" value={reminder.event_date} />
		<input type="hidden" name="lead_days" value={reminder.lead_days} />
		<Button variant="secondary" size={compact ? 'sm' : 'default'} class="min-h-11">
			<ClockIcon />
			Snooze
		</Button>
	</form>

	<form method="POST" action={`${actionBase}?/dismiss`}>
		<input type="hidden" name="tracked_item_id" value={reminder.tracked_item_id} />
		<input type="hidden" name="event_kind" value={reminder.event_kind} />
		<input type="hidden" name="event_date" value={reminder.event_date} />
		<input type="hidden" name="lead_days" value={reminder.lead_days} />
		<Button variant="ghost" size={compact ? 'sm' : 'default'} class="min-h-11">
			<XIcon />
			Dismiss
		</Button>
	</form>
</div>
