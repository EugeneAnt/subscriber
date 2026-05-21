<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import ReminderList from '$lib/components/ReminderList.svelte';

	let { data } = $props();

	onMount(() => {
		if (data.flash?.type === 'success') {
			toast.success(data.flash.message);
		}
	});
</script>

<svelte:head>
	<title>Reminders - Subscriber</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold">Reminders</h1>
		<p class="text-sm text-muted-foreground">
			Payment reminders due 7 days and 1 day before upcoming billing dates.
		</p>
	</div>

	<ReminderList reminders={data.reminders} />
</div>
