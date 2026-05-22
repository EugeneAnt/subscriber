<script lang="ts">
	import ProviderCostLines from './ProviderCostLines.svelte';

	import type { ProviderConnectionCard } from '$lib/server/provider-costs';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	type Line = {
		id?: string;
		external_project_id?: string | null;
		line_item?: string | null;
		amount: number | string;
		currency: string;
	};

	type Props = {
		connection: ProviderConnectionCard;
		lines?: Line[];
	};

	let { connection, lines = [] }: Props = $props();

	const statusLabels: Record<ProviderConnectionCard['budget_status'], string> = {
		unknown: 'Unknown',
		healthy: 'Healthy',
		warning: 'Warning',
		critical: 'Critical',
		over_budget: 'Over budget',
		sync_error: 'Sync error'
	};

	function badgeVariant(status: ProviderConnectionCard['budget_status']): BadgeVariant {
		if (status === 'sync_error' || status === 'over_budget' || status === 'critical') {
			return 'destructive';
		}

		if (status === 'warning') return 'outline';
		if (status === 'healthy') return 'secondary';
		return 'ghost';
	}

	function numeric(value: string | number | null | undefined): number | null {
		if (typeof value === 'number') return Number.isFinite(value) ? value : null;
		if (typeof value !== 'string' || value.trim() === '') return null;

		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	function formatAmount(
		value: string | number | null | undefined,
		currency: string | null | undefined
	): string {
		const parsed = numeric(value);
		if (parsed === null || !currency) return 'Not available';

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			maximumFractionDigits: 6
		}).format(parsed);
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return 'Never';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}
</script>

<article class="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h3 class="text-lg font-semibold">{connection.display_name}</h3>
			<p class="text-sm text-muted-foreground">Provider-reported current UTC-month spend.</p>
		</div>
		<Badge variant={badgeVariant(connection.budget_status)}>
			{statusLabels[connection.budget_status]}
		</Badge>
	</div>

	<div class="grid gap-3 sm:grid-cols-3">
		<div>
			<p class="text-sm text-muted-foreground">Current month spend</p>
			<p class="text-xl font-semibold tabular-nums">
				{formatAmount(connection.current_period_spend, connection.current_period_currency)}
			</p>
		</div>
		<div>
			<p class="text-sm text-muted-foreground">Monthly budget</p>
			<p class="text-xl font-semibold tabular-nums">
				{formatAmount(connection.monthly_budget, connection.currency)}
			</p>
		</div>
		<div>
			<p class="text-sm text-muted-foreground">Budget remaining</p>
			<p class="text-xl font-semibold tabular-nums">
				{formatAmount(connection.remaining_budget, connection.currency)}
			</p>
		</div>
	</div>

	{#if connection.last_sync_status === 'error' && connection.last_sync_error}
		<p class="text-sm text-destructive" role="alert">{connection.last_sync_error}</p>
	{/if}

	<p class="text-sm text-muted-foreground">
		Last synced: {formatDateTime(connection.latest_fetched_at)}
	</p>

	<form method="POST" action="?/refreshProviderCost">
		<input type="hidden" name="connection_id" value={connection.id} />
		<Button type="submit" class="min-h-11">Refresh</Button>
	</form>

	<form method="POST" action="?/updateProviderBudget" class="grid gap-3 sm:grid-cols-4">
		<input type="hidden" name="connection_id" value={connection.id} />
		<div class="space-y-2">
			<Label for={`budget-${connection.id}`}>Monthly budget</Label>
			<Input
				id={`budget-${connection.id}`}
				name="monthly_budget"
				inputmode="decimal"
				value={connection.monthly_budget ?? ''}
			/>
		</div>
		<div class="space-y-2">
			<Label for={`warning-${connection.id}`}>Warning left</Label>
			<Input
				id={`warning-${connection.id}`}
				name="warning_remaining_amount"
				inputmode="decimal"
				value={connection.warning_remaining_amount ?? ''}
			/>
		</div>
		<div class="space-y-2">
			<Label for={`critical-${connection.id}`}>Critical left</Label>
			<Input
				id={`critical-${connection.id}`}
				name="critical_remaining_amount"
				inputmode="decimal"
				value={connection.critical_remaining_amount ?? ''}
			/>
		</div>
		<div class="flex items-end">
			<Button type="submit" variant="outline" class="min-h-11 w-full">Save budget</Button>
		</div>
	</form>

	<ProviderCostLines {lines} />
</article>
