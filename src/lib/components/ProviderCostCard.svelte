<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import ProviderCostLines from './ProviderCostLines.svelte';

	import type { ProviderConnectionCard } from '$lib/server/provider-costs';
	import { shouldAutoRefreshProviderCost } from '$lib/provider-cost-freshness';
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
		cacheMinutes?: number;
		autoRefresh?: boolean;
	};

	let { connection, lines = [], cacheMinutes = 60, autoRefresh = true }: Props = $props();
	let cardOverride = $state<ProviderConnectionCard | null>(null);
	let cardLinesOverride = $state<Line[] | null>(null);
	let card = $derived(cardOverride ?? connection);
	let cardLines = $derived(cardLinesOverride ?? lines);
	let refreshPending = $state(false);
	let budgetPending = $state(false);
	let localError = $state<string | null>(null);

	type ProviderCostPayload = {
		connection: ProviderConnectionCard;
		lines: Line[];
	};

	$effect(() => {
		if (cardOverride && cardOverride.id !== connection.id) {
			cardOverride = null;
			cardLinesOverride = null;
			localError = null;
		}
	});

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

	async function readProviderCostPayload(response: Response): Promise<ProviderCostPayload> {
		const body = (await response.json().catch(() => null)) as
			| (Partial<ProviderCostPayload> & { message?: string })
			| null;

		if (!response.ok) {
			throw new Error(body?.message ?? 'Provider cost action failed.');
		}

		if (!body?.connection || !Array.isArray(body.lines)) {
			throw new Error('Provider cost response was incomplete.');
		}

		return {
			connection: body.connection,
			lines: body.lines
		};
	}

	function applyProviderCostPayload(payload: ProviderCostPayload): void {
		cardOverride = payload.connection;
		cardLinesOverride = payload.lines;
		localError = null;
	}

	async function submitProviderData(url: string, body: FormData): Promise<void> {
		const response = await fetch(url, {
			method: 'POST',
			body,
			headers: { accept: 'application/json' }
		});

		applyProviderCostPayload(await readProviderCostPayload(response));
	}

	async function refreshCurrentProvider(options = { notify: true }): Promise<void> {
		if (refreshPending) return;

		refreshPending = true;
		localError = null;

		try {
			const body = new FormData();
			body.set('connection_id', card.id);
			await submitProviderData(`/provider-costs/${card.id}/refresh`, body);
			if (options.notify) toast.success('Provider costs refreshed.');
		} catch (error) {
			localError = error instanceof Error ? error.message : 'Provider refresh failed.';
			if (options.notify) toast.error(localError);
		} finally {
			refreshPending = false;
		}
	}

	async function refreshProvider(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		await refreshCurrentProvider();
	}

	async function saveBudget(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const form = event.currentTarget;
		if (!(form instanceof HTMLFormElement)) return;

		budgetPending = true;
		localError = null;

		try {
			await submitProviderData(`/provider-costs/${card.id}/budget`, new FormData(form));
			toast.success('Budget saved.');
		} catch (error) {
			localError = error instanceof Error ? error.message : 'Budget settings could not be saved.';
			toast.error(localError);
		} finally {
			budgetPending = false;
		}
	}

	onMount(() => {
		if (autoRefresh && shouldAutoRefreshProviderCost(card, cacheMinutes)) {
			void refreshCurrentProvider({ notify: false });
		}
	});
</script>

<article
	class="space-y-4 rounded-lg border bg-card p-4 text-card-foreground"
	aria-busy={refreshPending}
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h3 class="text-lg font-semibold">{card.display_name}</h3>
			<p class="text-sm text-muted-foreground">Provider-reported current UTC-month spend.</p>
		</div>
		<Badge variant={badgeVariant(card.budget_status)}>
			{statusLabels[card.budget_status]}
		</Badge>
	</div>

	<div class="grid gap-3 sm:grid-cols-3">
		<div>
			<p class="text-sm text-muted-foreground">Current month spend</p>
			<p class="text-xl font-semibold tabular-nums">
				{formatAmount(card.current_period_spend, card.current_period_currency)}
			</p>
		</div>
		<div>
			<p class="text-sm text-muted-foreground">Monthly budget</p>
			<p class="text-xl font-semibold tabular-nums">
				{formatAmount(card.monthly_budget, card.currency)}
			</p>
		</div>
		<div>
			<p class="text-sm text-muted-foreground">Budget remaining</p>
			<p class="text-xl font-semibold tabular-nums">
				{formatAmount(card.remaining_budget, card.currency)}
			</p>
		</div>
	</div>

	{#if localError}
		<p class="text-sm text-destructive" role="alert">{localError}</p>
	{:else if card.last_sync_status === 'error' && card.last_sync_error}
		<p class="text-sm text-destructive" role="alert">{card.last_sync_error}</p>
	{/if}

	<p class="text-sm text-muted-foreground">
		Last synced: {formatDateTime(card.latest_fetched_at)}
	</p>

	<form method="POST" action="?/refreshProviderCost" onsubmit={refreshProvider}>
		<input type="hidden" name="connection_id" value={card.id} />
		<Button type="submit" class="min-h-11" disabled={refreshPending}>
			{#if refreshPending}
				<span
					class="me-2 size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
					aria-hidden="true"
				></span>
				Refreshing
			{:else}
				Refresh
			{/if}
		</Button>
	</form>

	<form
		method="POST"
		action="?/updateProviderBudget"
		class="grid gap-3 sm:grid-cols-4"
		onsubmit={saveBudget}
	>
		<input type="hidden" name="connection_id" value={card.id} />
		<div class="space-y-2">
			<Label for={`budget-${card.id}`}>Monthly budget</Label>
			<Input
				id={`budget-${card.id}`}
				name="monthly_budget"
				inputmode="decimal"
				value={card.monthly_budget ?? ''}
			/>
		</div>
		<div class="space-y-2">
			<Label for={`warning-${card.id}`}>Warning left</Label>
			<Input
				id={`warning-${card.id}`}
				name="warning_remaining_amount"
				inputmode="decimal"
				value={card.warning_remaining_amount ?? ''}
			/>
		</div>
		<div class="space-y-2">
			<Label for={`critical-${card.id}`}>Critical left</Label>
			<Input
				id={`critical-${card.id}`}
				name="critical_remaining_amount"
				inputmode="decimal"
				value={card.critical_remaining_amount ?? ''}
			/>
		</div>
		<div class="flex items-end">
			<Button type="submit" variant="outline" class="min-h-11 w-full" disabled={budgetPending}>
				{#if budgetPending}
					<span
						class="me-2 size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
						aria-hidden="true"
					></span>
					Saving
				{:else}
					Save budget
				{/if}
			</Button>
		</div>
	</form>

	<ProviderCostLines lines={cardLines} />
</article>
