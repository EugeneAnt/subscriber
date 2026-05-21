<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import type { DashboardItem } from '$lib/types/dashboard';

	import ItemActions from './ItemActions.svelte';

	type Props = {
		rows: DashboardItem[];
	};

	let { rows }: Props = $props();

	function badgeVariant(status: DashboardItem['effective_status']): BadgeVariant {
		if (status === 'expired' || status === 'cancelled') return 'destructive';
		if (status === 'paused') return 'outline';
		return 'secondary';
	}

	function formatAmount(amount: number | null, currency: string | null): string | null {
		return amount !== null && currency ? `${amount.toFixed(2)} ${currency}` : null;
	}
</script>

<ul class="space-y-2 md:hidden">
	{#each rows as row (row.id)}
		<li>
			<div
				class="relative min-h-11 rounded-lg border bg-card p-4 text-card-foreground active:bg-muted"
				style="touch-action: manipulation"
			>
				<a
					href={resolve('/(app)/items/[id]', { id: row.id })}
					class="absolute inset-0 rounded-lg"
					aria-label={`Edit ${row.name}`}
				></a>

				<div class="flex items-start justify-between gap-3">
					<div class="pointer-events-none relative z-10 min-w-0">
						<p class="truncate font-medium">{row.name}</p>
						<p class="text-xs text-muted-foreground">
							<span class="capitalize">{row.type}</span>
							{#if row.category}
								<span> · {row.category}</span>
							{/if}
						</p>
					</div>
					<div class="relative z-10 flex shrink-0 items-start gap-1">
						<div class="pointer-events-none pt-2">
							<Badge variant={badgeVariant(row.effective_status)}>{row.effective_status}</Badge>
						</div>
						<ItemActions id={row.id} name={row.name} class="-mr-2 -mt-2" />
					</div>
				</div>

				<div
					class="pointer-events-none relative z-10 mt-3 flex items-center justify-between gap-3 text-sm"
				>
					<span class="truncate text-muted-foreground">
						{row.effective_next_date ?? row.expiry_date ?? 'No date'}
					</span>
					{#if formatAmount(row.amount, row.currency)}
						<span class="shrink-0 tabular-nums">{formatAmount(row.amount, row.currency)}</span>
					{/if}
				</div>
			</div>
		</li>
	{/each}
</ul>
