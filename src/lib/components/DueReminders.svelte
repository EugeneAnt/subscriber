<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { ReminderRow } from '$lib/server/reminders';

	import ReminderList from './ReminderList.svelte';

	type Props = {
		reminders: ReminderRow[];
		totalCount: number;
	};

	let { reminders, totalCount }: Props = $props();
</script>

{#if totalCount > 0}
	<section class="space-y-3" aria-labelledby="due-reminders-heading">
		<div class="flex items-center justify-between gap-3">
			<div>
				<h2 id="due-reminders-heading" class="text-lg font-semibold">Due reminders</h2>
				<p class="text-sm text-muted-foreground">
					{totalCount} payment {totalCount === 1 ? 'reminder' : 'reminders'} need attention.
				</p>
			</div>
			<Button href="/reminders" variant="outline">View all</Button>
		</div>

		<ReminderList {reminders} compact actionBase="/reminders" />
	</section>
{/if}
