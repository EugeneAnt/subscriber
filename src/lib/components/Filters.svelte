<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { DashboardFilters } from '$lib/types/dashboard';

	type Props = {
		filters: DashboardFilters;
		categories: string[];
		providers: string[];
	};

	let { filters, categories, providers }: Props = $props();
</script>

<form
	method="GET"
	class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
	data-sveltekit-keepfocus
>
	<select
		name="type"
		value={filters.type ?? ''}
		class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 rounded-lg border px-3 text-base outline-none focus-visible:ring-3"
		aria-label="Filter by type"
	>
		<option value="">All types</option>
		<option value="subscription">Subscription</option>
		<option value="expiry">Expiry</option>
		<option value="hybrid">Hybrid</option>
	</select>

	<select
		name="status"
		value={filters.status ?? ''}
		class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 rounded-lg border px-3 text-base outline-none focus-visible:ring-3"
		aria-label="Filter by status"
	>
		<option value="">All statuses</option>
		<option value="active">Active</option>
		<option value="paused">Paused</option>
		<option value="cancelled">Cancelled</option>
		<option value="expired">Expired</option>
	</select>

	<select
		name="category"
		value={filters.category ?? ''}
		class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 rounded-lg border px-3 text-base outline-none focus-visible:ring-3"
		aria-label="Filter by category"
	>
		<option value="">All categories</option>
		{#each categories as category (category)}
			<option value={category}>{category}</option>
		{/each}
	</select>

	<select
		name="provider"
		value={filters.provider ?? ''}
		class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 rounded-lg border px-3 text-base outline-none focus-visible:ring-3"
		aria-label="Filter by provider"
	>
		<option value="">All providers</option>
		{#each providers as provider (provider)}
			<option value={provider}>{provider}</option>
		{/each}
	</select>

	<div class="flex gap-2">
		<Button type="submit" class="min-h-11 flex-1 lg:flex-none">Apply</Button>
		<Button href="/" variant="outline" class="min-h-11 flex-1 lg:flex-none">Reset</Button>
	</div>
</form>
