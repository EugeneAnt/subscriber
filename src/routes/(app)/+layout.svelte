<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import ReminderBadge from '$lib/components/ReminderBadge.svelte';

	let { children, data } = $props();

	onMount(() => {
		const reloadRestoredPage = (event: PageTransitionEvent) => {
			if (event.persisted) {
				window.location.reload();
			}
		};

		window.addEventListener('pageshow', reloadRestoredPage);
		return () => window.removeEventListener('pageshow', reloadRestoredPage);
	});
</script>

<header class="border-b">
	<div class="container mx-auto flex items-center justify-between p-4">
		<a href={resolve('/')} class="font-semibold">Subscriber</a>
		<div class="flex items-center gap-2">
			<ReminderBadge count={data.reminderCount ?? 0} />
			<form method="POST" action="/logout">
				<button class="min-h-11 text-sm underline" type="submit">
					Sign out ({data.user?.email ?? 'Unknown'})
				</button>
			</form>
		</div>
	</div>
</header>
<main class="container mx-auto p-4 pb-safe">
	{@render children()}
</main>
