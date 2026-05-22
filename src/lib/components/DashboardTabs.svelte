<script lang="ts">
	import { cn } from '$lib/utils';

	type Tab = 'subscriptions' | 'payg';

	let { active }: { active: Tab } = $props();

	const tabs: { id: Tab; label: string; href: string }[] = [
		{ id: 'subscriptions', label: 'Subscriptions', href: '/' },
		{ id: 'payg', label: 'Pay-as-you-go', href: '/?tab=payg' }
	];
</script>

<nav class="flex gap-2 border-b" aria-label="Dashboard sections">
	{#each tabs as tab (tab.id)}
		<a
			href={tab.href}
			class={cn(
				'min-h-11 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
				active === tab.id
					? 'border-foreground text-foreground'
					: 'border-transparent text-muted-foreground hover:text-foreground'
			)}
			aria-current={active === tab.id ? 'page' : undefined}
		>
			{tab.label}
		</a>
	{/each}
</nav>
