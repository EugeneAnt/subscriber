<script lang="ts">
	import { cn } from '$lib/utils';

	type Tab = 'subscriptions' | 'payg';

	let { active }: { active: Tab } = $props();
</script>

<nav class="flex gap-2 border-b" aria-label="Dashboard sections">
	<!-- eslint-disable svelte/no-navigation-without-resolve -- URL-backed tabs need the query string preserved. -->
	<a
		href="/"
		data-sveltekit-reload
		class={cn(
			'min-h-11 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
			active === 'subscriptions'
				? 'border-foreground text-foreground'
				: 'border-transparent text-muted-foreground hover:text-foreground'
		)}
		aria-current={active === 'subscriptions' ? 'page' : undefined}
	>
		Subscriptions
	</a>
	<a
		href="/?tab=payg"
		data-sveltekit-reload
		class={cn(
			'min-h-11 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
			active === 'payg'
				? 'border-foreground text-foreground'
				: 'border-transparent text-muted-foreground hover:text-foreground'
		)}
		aria-current={active === 'payg' ? 'page' : undefined}
	>
		Pay-as-you-go
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</nav>
