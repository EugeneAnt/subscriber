<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import type { DashboardItem } from '$lib/types/dashboard';

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
			<a
				href={resolve('/(app)/items/[id]', { id: row.id })}
				class="block min-h-11 rounded-lg border bg-card p-4 text-card-foreground active:bg-muted"
				style="touch-action: manipulation"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="truncate font-medium">{row.name}</p>
						<p class="text-xs text-muted-foreground">
							<span class="capitalize">{row.type}</span>
							{#if row.category}
								<span> · {row.category}</span>
							{/if}
						</p>
					</div>
					<Badge variant={badgeVariant(row.effective_status)}>{row.effective_status}</Badge>
				</div>

				<div class="mt-3 flex items-center justify-between gap-3 text-sm">
					<span class="truncate text-muted-foreground">
						{row.effective_next_date ?? row.expiry_date ?? 'No date'}
					</span>
					{#if formatAmount(row.amount, row.currency)}
						<span class="shrink-0 tabular-nums">{formatAmount(row.amount, row.currency)}</span>
					{/if}
				</div>
			</a>
		</li>
	{/each}
</ul>
