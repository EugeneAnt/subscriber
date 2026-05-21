<script lang="ts">
	import { onMount } from 'svelte';
	import type { SuperValidated } from 'sveltekit-superforms';

	import DatePicker from '$lib/components/DatePicker.svelte';
	import FormSelect, { type FormSelectOption } from '$lib/components/FormSelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { TrackedItemInput } from '$lib/schemas/tracked-item';

	type FormShape = SuperValidated<TrackedItemInput>;

	type Props = {
		form: FormShape;
		action: string;
		submitLabel?: string;
		currencies: string[];
		hiddenUpdatedAt?: string | null;
	};

	let { form, action, submitLabel = 'Save', currencies, hiddenUpdatedAt = null }: Props = $props();
	let enhanced = $state(false);

	onMount(() => {
		enhanced = true;
	});

	// svelte-ignore state_referenced_locally
	let type = $state<TrackedItemInput['type']>(form.data.type ?? 'subscription');
	// svelte-ignore state_referenced_locally
	let billingCycle = $state<NonNullable<TrackedItemInput['billing_cycle']>>(
		form.data.billing_cycle ?? 'monthly'
	);
	// svelte-ignore state_referenced_locally
	let status = $state<TrackedItemInput['status']>(form.data.status ?? 'active');
	// svelte-ignore state_referenced_locally
	let currency = $state(form.data.currency ?? '');

	const typeOptions: FormSelectOption[] = [
		{ value: 'subscription', label: 'Subscription' },
		{ value: 'expiry', label: 'Expiry only' },
		{ value: 'hybrid', label: 'Hybrid' }
	];
	const statusOptions: FormSelectOption[] = [
		{ value: 'active', label: 'Active' },
		{ value: 'paused', label: 'Paused' },
		{ value: 'cancelled', label: 'Cancelled' }
	];
	const billingCycleOptions: FormSelectOption[] = [
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'quarterly', label: 'Quarterly' },
		{ value: 'yearly', label: 'Yearly' },
		{ value: 'custom_days', label: 'Every N days' }
	];
	const currencyOptions = $derived<FormSelectOption[]>([
		{ value: '', label: 'None' },
		...currencies.map((code) => ({ value: code, label: code }))
	]);

	const needsBilling = $derived(type === 'subscription' || type === 'hybrid');
	const needsExpiry = $derived(type === 'expiry' || type === 'hybrid');
	const needsCustomDays = $derived(billingCycle === 'custom_days');

	function fieldError(name: keyof TrackedItemInput): string | undefined {
		const errors = form.errors[name];
		return Array.isArray(errors) ? errors[0] : undefined;
	}
</script>

<form method="POST" {action} class="space-y-5" data-enhanced={enhanced ? 'true' : undefined}>
	{#if hiddenUpdatedAt}
		<input type="hidden" name="updated_at" value={hiddenUpdatedAt} />
	{/if}

	<div class="space-y-2">
		<Label for="name">Name</Label>
		<Input
			id="name"
			name="name"
			required
			minlength={1}
			maxlength={200}
			value={form.data.name ?? ''}
			aria-invalid={fieldError('name') ? 'true' : undefined}
		/>
		{#if fieldError('name')}
			<p class="text-sm text-destructive" role="alert">{fieldError('name')}</p>
		{/if}
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="type">Type</Label>
			<FormSelect
				id="type"
				name="type"
				bind:value={type}
				options={typeOptions}
				invalid={Boolean(fieldError('type'))}
			/>
			{#if fieldError('type')}
				<p class="text-sm text-destructive" role="alert">{fieldError('type')}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="status">Status</Label>
			<FormSelect
				id="status"
				name="status"
				bind:value={status}
				options={statusOptions}
				invalid={Boolean(fieldError('status'))}
			/>
			{#if fieldError('status')}
				<p class="text-sm text-destructive" role="alert">{fieldError('status')}</p>
			{/if}
		</div>
	</div>

	{#key type}
		{#if needsBilling}
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="billing_cycle">Billing cycle</Label>
					<FormSelect
						id="billing_cycle"
						name="billing_cycle"
						bind:value={billingCycle}
						options={billingCycleOptions}
						invalid={Boolean(fieldError('billing_cycle'))}
					/>
					{#if fieldError('billing_cycle')}
						<p class="text-sm text-destructive" role="alert">{fieldError('billing_cycle')}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="billing_anchor_date">Billing anchor date</Label>
					<DatePicker
						id="billing_anchor_date"
						name="billing_anchor_date"
						min="1900-01-01"
						max="2100-12-31"
						value={form.data.billing_anchor_date ?? ''}
						invalid={Boolean(fieldError('billing_anchor_date'))}
					/>
					{#if fieldError('billing_anchor_date')}
						<p class="text-sm text-destructive" role="alert">{fieldError('billing_anchor_date')}</p>
					{/if}
				</div>
			</div>

			{#if needsCustomDays}
				<div class="space-y-2">
					<Label for="custom_cycle_days">Every (days)</Label>
					<Input
						id="custom_cycle_days"
						name="custom_cycle_days"
						type="number"
						min="1"
						max="3650"
						step="1"
						required
						value={form.data.custom_cycle_days ?? ''}
						aria-invalid={fieldError('custom_cycle_days') ? 'true' : undefined}
					/>
					{#if fieldError('custom_cycle_days')}
						<p class="text-sm text-destructive" role="alert">{fieldError('custom_cycle_days')}</p>
					{/if}
				</div>
			{/if}
		{/if}
	{/key}

	{#key type}
		{#if needsExpiry}
			<div class="space-y-2">
				<Label for="expiry_date">Expiry date</Label>
				<DatePicker
					id="expiry_date"
					name="expiry_date"
					min="1900-01-01"
					max="2100-12-31"
					value={form.data.expiry_date ?? ''}
					invalid={Boolean(fieldError('expiry_date'))}
				/>
				{#if fieldError('expiry_date')}
					<p class="text-sm text-destructive" role="alert">{fieldError('expiry_date')}</p>
				{/if}
			</div>
		{/if}
	{/key}

	<div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
		<div class="space-y-2">
			<Label for="amount">Amount</Label>
			<Input
				id="amount"
				name="amount"
				type="number"
				min="0"
				max="9999999999.99"
				step="0.01"
				value={form.data.amount ?? ''}
				aria-invalid={fieldError('amount') ? 'true' : undefined}
			/>
			{#if fieldError('amount')}
				<p class="text-sm text-destructive" role="alert">{fieldError('amount')}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="currency">Currency</Label>
			<FormSelect
				id="currency"
				name="currency"
				bind:value={currency}
				options={currencyOptions}
				invalid={Boolean(fieldError('currency'))}
			/>
			{#if fieldError('currency')}
				<p class="text-sm text-destructive" role="alert">{fieldError('currency')}</p>
			{/if}
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="category">Category</Label>
			<Input
				id="category"
				name="category"
				maxlength={200}
				value={form.data.category ?? ''}
				aria-invalid={fieldError('category') ? 'true' : undefined}
			/>
			{#if fieldError('category')}
				<p class="text-sm text-destructive" role="alert">{fieldError('category')}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="provider">Provider</Label>
			<Input
				id="provider"
				name="provider"
				maxlength={200}
				value={form.data.provider ?? ''}
				aria-invalid={fieldError('provider') ? 'true' : undefined}
			/>
			{#if fieldError('provider')}
				<p class="text-sm text-destructive" role="alert">{fieldError('provider')}</p>
			{/if}
		</div>
	</div>

	<div class="space-y-2">
		<Label for="notes">Notes</Label>
		<Textarea
			id="notes"
			name="notes"
			maxlength={5000}
			rows={4}
			value={form.data.notes ?? ''}
			aria-invalid={fieldError('notes') ? 'true' : undefined}
		/>
		{#if fieldError('notes')}
			<p class="text-sm text-destructive" role="alert">{fieldError('notes')}</p>
		{/if}
	</div>

	{#if form.errors._errors?.[0]}
		<p
			class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
			role="alert"
		>
			{form.errors._errors[0]}
		</p>
	{/if}

	<Button type="submit" class="min-h-11 w-full sm:w-auto">{submitLabel}</Button>
</form>
