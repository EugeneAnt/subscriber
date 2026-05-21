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

	function formatAmount(amount: number | null, currency: string | null): string {
		return amount !== null && currency ? `${amount.toFixed(2)} ${currency}` : '';
	}
</script>

<div class="hidden overflow-x-auto rounded-lg border bg-card md:block">
	<table class="w-full text-sm">
		<thead>
			<tr class="border-b text-left text-muted-foreground">
				<th class="px-3 py-3 font-medium">Name</th>
				<th class="px-3 py-3 font-medium">Type</th>
				<th class="px-3 py-3 font-medium">Status</th>
				<th class="px-3 py-3 font-medium">Category</th>
				<th class="px-3 py-3 font-medium">Provider</th>
				<th class="px-3 py-3 font-medium">Next bill</th>
				<th class="px-3 py-3 font-medium">Expires</th>
				<th class="px-3 py-3 text-right font-medium">Amount</th>
				<th class="px-3 py-3 text-right font-medium">
					<span class="sr-only">Actions</span>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.id)}
				<tr class="border-b last:border-0">
					<td class="max-w-52 px-3 py-3">
						<a
							class="block truncate font-medium hover:underline"
							href={resolve('/(app)/items/[id]', { id: row.id })}
						>
							{row.name}
						</a>
					</td>
					<td class="px-3 py-3 capitalize">{row.type}</td>
					<td class="px-3 py-3">
						<Badge variant={badgeVariant(row.effective_status)}>{row.effective_status}</Badge>
					</td>
					<td class="px-3 py-3 text-muted-foreground">{row.category ?? ''}</td>
					<td class="px-3 py-3 text-muted-foreground">{row.provider ?? ''}</td>
					<td class="px-3 py-3 tabular-nums">{row.effective_next_date ?? ''}</td>
					<td class="px-3 py-3 tabular-nums">{row.expiry_date ?? ''}</td>
					<td class="px-3 py-3 text-right tabular-nums">{formatAmount(row.amount, row.currency)}</td
					>
					<td class="px-2 py-2 text-right">
						<ItemActions id={row.id} name={row.name} />
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
