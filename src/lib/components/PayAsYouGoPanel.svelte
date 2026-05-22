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
	};

	let { connections, linesByConnection, configured }: Props = $props();
</script>

<section class="space-y-4" aria-labelledby="payg-heading">
	<div>
		<h2 id="payg-heading" class="text-lg font-semibold">Pay-as-you-go</h2>
		<p class="text-sm text-muted-foreground">
			Provider-reported variable spend. Values are cached and refreshed on demand.
		</p>
	</div>

	{#if !configured}
		<EmptyState
			title="OpenAI cost sync is not configured"
			body="Set OPENAI_ADMIN_KEY in the server environment to enable OpenAI API cost sync."
		/>
	{:else if connections.length === 0}
		<EmptyState title="No provider connections" body="OpenAI API cost sync will appear here." />
	{:else}
		<div class="space-y-4">
			{#each connections as connection (connection.id)}
				<ProviderCostCard {connection} lines={linesByConnection[connection.id] ?? []} />
			{/each}
		</div>
	{/if}
</section>
