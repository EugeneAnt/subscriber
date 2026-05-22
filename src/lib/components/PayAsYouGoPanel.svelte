<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ProviderCostCard from './ProviderCostCard.svelte';

	import type { ProviderConnectionCard } from '$lib/server/provider-costs';
	import type { Database } from '$lib/types/database';

	type Line = Database['public']['Tables']['provider_cost_snapshot_lines']['Row'];

	type Props = {
		connections: ProviderConnectionCard[];
		linesByConnection: Record<string, Line[]>;
		configured: boolean;
		cacheMinutes?: number;
		loading?: boolean;
		error?: string | null;
	};

	let {
		connections,
		linesByConnection,
		configured,
		cacheMinutes = 60,
		loading = false,
		error = null
	}: Props = $props();
</script>

<section class="space-y-4" aria-labelledby="payg-heading">
	<div>
		<h2 id="payg-heading" class="text-lg font-semibold">Pay-as-you-go</h2>
		<p class="text-sm text-muted-foreground">
			Provider-reported variable spend. Cached values refresh automatically when stale.
		</p>
	</div>

	{#if loading}
		<div class="rounded-lg border bg-card p-4 text-card-foreground" role="status">
			<div class="flex items-center gap-3">
				<div
					class="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground"
				></div>
				<p class="text-sm text-muted-foreground">Loading provider costs...</p>
			</div>
		</div>
	{:else if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive"
			role="alert"
		>
			<p class="text-sm">{error}</p>
		</div>
	{:else if !configured}
		<EmptyState
			title="Provider cost sync is not configured"
			body="Set at least one supported provider admin key in the server environment to enable pay-as-you-go cost cards."
		/>
	{:else if connections.length === 0}
		<EmptyState
			title="No provider connections"
			body="Configured provider cost sync will appear here."
		/>
	{:else}
		<div class="space-y-4">
			{#each connections as connection (connection.id)}
				<ProviderCostCard
					{connection}
					lines={linesByConnection[connection.id] ?? []}
					{cacheMinutes}
				/>
			{/each}
		</div>
	{/if}
</section>
