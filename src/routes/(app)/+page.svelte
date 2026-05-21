<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Filters from '$lib/components/Filters.svelte';
	import ItemCardList from '$lib/components/ItemCardList.svelte';
	import ItemTable from '$lib/components/ItemTable.svelte';
	import SummaryTiles from '$lib/components/SummaryTiles.svelte';
	import UpcomingList from '$lib/components/UpcomingList.svelte';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard — Subscriber</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold">Dashboard</h1>
			<p class="text-sm text-muted-foreground">
				Subscriptions, renewals, and expiries in one place.
			</p>
		</div>
		<Button href="/items/new" class="min-h-11 w-full sm:w-auto">Add item</Button>
	</div>

	<SummaryTiles
		activeCount={data.activeCount}
		upcoming30Count={data.upcoming30Count}
		burn={data.burn}
	/>

	{#if data.items.length === 0 && Object.keys(data.filters).length === 0}
		<EmptyState
			title="No items yet"
			body="Track your first subscription, renewal, warranty, or license."
			actionHref="/items/new"
			actionLabel="Add your first item"
		/>
	{:else}
		<UpcomingList events={data.events} />

		<section class="space-y-3" aria-labelledby="items-heading">
			<div class="flex items-center justify-between gap-3">
				<h2 id="items-heading" class="text-lg font-semibold">All items</h2>
				<p class="text-sm text-muted-foreground tabular-nums">{data.items.length} shown</p>
			</div>

			<Filters filters={data.filters} categories={data.categories} providers={data.providers} />

			{#if data.items.length === 0}
				<EmptyState
					title="No items match these filters"
					body="Reset filters or adjust the selection."
				/>
			{:else}
				<ItemTable rows={data.items} />
				<ItemCardList rows={data.items} />
			{/if}
		</section>
	{/if}
</div>
