<script lang="ts">
	import type { DashboardBurn } from '$lib/types/dashboard';

	type Props = {
		activeCount: number;
		upcoming30Count: number;
		burn: DashboardBurn[];
	};

	let { activeCount, upcoming30Count, burn }: Props = $props();

	const formatAmount = (value: number) =>
		new Intl.NumberFormat(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
</script>

<section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
	<div class="rounded-lg border bg-card p-4 text-card-foreground">
		<p class="text-sm text-muted-foreground">Active items</p>
		<p class="mt-1 text-2xl font-semibold tabular-nums">{activeCount}</p>
	</div>

	<div class="rounded-lg border bg-card p-4 text-card-foreground">
		<p class="text-sm text-muted-foreground">Upcoming 30 days</p>
		<p class="mt-1 text-2xl font-semibold tabular-nums">{upcoming30Count}</p>
	</div>

	{#each burn as row (row.currency)}
		<div class="rounded-lg border bg-card p-4 text-card-foreground">
			<p class="text-sm text-muted-foreground">Monthly burn ({row.currency})</p>
			<p class="mt-1 text-2xl font-semibold tabular-nums">
				{formatAmount(row.monthly_burn)}
			</p>
			<p class="text-xs text-muted-foreground tabular-nums">
				{formatAmount(row.monthly_burn * 12)} / year
			</p>
		</div>
	{/each}
</section>
