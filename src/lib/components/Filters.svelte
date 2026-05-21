<script lang="ts">
	import FormSelect, { type FormSelectOption } from '$lib/components/FormSelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { DashboardFilters } from '$lib/types/dashboard';

	type Props = {
		filters: DashboardFilters;
		categories: string[];
		providers: string[];
	};

	let { filters, categories, providers }: Props = $props();

	const typeOptions: FormSelectOption[] = [
		{ value: '', label: 'All types' },
		{ value: 'subscription', label: 'Subscription' },
		{ value: 'expiry', label: 'Expiry' },
		{ value: 'hybrid', label: 'Hybrid' }
	];
	const statusOptions: FormSelectOption[] = [
		{ value: '', label: 'All statuses' },
		{ value: 'active', label: 'Active' },
		{ value: 'paused', label: 'Paused' },
		{ value: 'cancelled', label: 'Cancelled' },
		{ value: 'expired', label: 'Expired' }
	];
	const categoryOptions = $derived<FormSelectOption[]>([
		{ value: '', label: 'All categories' },
		...categories.map((category) => ({ value: category, label: category }))
	]);
	const providerOptions = $derived<FormSelectOption[]>([
		{ value: '', label: 'All providers' },
		...providers.map((provider) => ({ value: provider, label: provider }))
	]);
</script>

<form
	method="GET"
	class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
	data-sveltekit-keepfocus
>
	<FormSelect
		name="type"
		value={filters.type ?? ''}
		options={typeOptions}
		ariaLabel="Filter by type"
	/>

	<FormSelect
		name="status"
		value={filters.status ?? ''}
		options={statusOptions}
		ariaLabel="Filter by status"
	/>

	<FormSelect
		name="category"
		value={filters.category ?? ''}
		options={categoryOptions}
		ariaLabel="Filter by category"
	/>

	<FormSelect
		name="provider"
		value={filters.provider ?? ''}
		options={providerOptions}
		ariaLabel="Filter by provider"
	/>

	<div class="flex gap-2">
		<Button type="submit" class="min-h-11 flex-1 lg:flex-none">Apply</Button>
		<Button href="/" variant="outline" class="min-h-11 flex-1 lg:flex-none">Reset</Button>
	</div>
</form>
