<script lang="ts">
	import { onMount } from 'svelte';
	import {
		intProxy,
		numberProxy,
		stringProxy,
		superForm,
		type SuperValidated
	} from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	import DatePicker from '$lib/components/DatePicker.svelte';
	import FormSelect, { type FormSelectOption } from '$lib/components/FormSelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { trackedItemSchema, type TrackedItemInput } from '$lib/schemas/tracked-item';

	type FormShape = SuperValidated<TrackedItemInput>;

	type Props = {
		form: FormShape;
		action: string;
		submitLabel?: string;
		currencies: string[];
		hiddenUpdatedAt?: string | null;
	};

	let {
		form: initialForm,
		action,
		submitLabel = 'Save',
		currencies,
		hiddenUpdatedAt = null
	}: Props = $props();
	let enhanced = $state(false);

	onMount(() => {
		enhanced = true;
	});

	// The Superforms client instance is intentionally created once for this form component.
	// svelte-ignore state_referenced_locally
	const itemForm = superForm(initialForm, {
		validators: valibotClient(trackedItemSchema),
		resetForm: false
	});
	const { form: formData, errors, enhance, submitting } = itemForm;

	const billingCycle = stringProxy(itemForm, 'billing_cycle', { empty: 'null' });
	const customCycleDays = intProxy(itemForm, 'custom_cycle_days', { empty: 'null' });
	const billingAnchorDate = stringProxy(itemForm, 'billing_anchor_date', { empty: 'null' });
	const amount = numberProxy(itemForm, 'amount', { empty: 'null' });
	const currency = stringProxy(itemForm, 'currency', { empty: 'null' });
	const expiryDate = stringProxy(itemForm, 'expiry_date', { empty: 'null' });
	const category = stringProxy(itemForm, 'category', { empty: 'null' });
	const provider = stringProxy(itemForm, 'provider', { empty: 'null' });
	const notes = stringProxy(itemForm, 'notes', { empty: 'null' });

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

	const needsBilling = $derived($formData.type === 'subscription' || $formData.type === 'hybrid');
	const needsExpiry = $derived($formData.type === 'expiry' || $formData.type === 'hybrid');
	const needsCustomDays = $derived($billingCycle === 'custom_days');

	$effect(() => {
		if (!needsBilling) {
			$billingCycle = '';
			$billingAnchorDate = '';
			$customCycleDays = '';
		} else if (!$billingCycle) {
			$billingCycle = 'monthly';
		}

		if (!needsExpiry) {
			$expiryDate = '';
		}

		if (!needsCustomDays) {
			$customCycleDays = '';
		}
	});
</script>

<form
	method="POST"
	{action}
	use:enhance
	class="space-y-5"
	data-enhanced={enhanced ? 'true' : undefined}
>
	{#if hiddenUpdatedAt}
		<input type="hidden" name="updated_at" value={hiddenUpdatedAt} />
	{/if}

	<Form.Field form={itemForm} name="name">
		<Form.Control id="name">
			{#snippet children({ props })}
				<Form.Label>Name</Form.Label>
				<Input {...props} required minlength={1} maxlength={200} bind:value={$formData.name} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<div class="grid gap-4 sm:grid-cols-2">
		<Form.Field form={itemForm} name="type">
			<Form.Control id="type">
				{#snippet children({ props })}
					<Form.Label>Type</Form.Label>
					<FormSelect
						id={props.id}
						name={props.name}
						bind:value={$formData.type}
						options={typeOptions}
						ariaDescribedBy={props['aria-describedby']}
						invalid={props['aria-invalid'] === 'true'}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field form={itemForm} name="status">
			<Form.Control id="status">
				{#snippet children({ props })}
					<Form.Label>Status</Form.Label>
					<FormSelect
						id={props.id}
						name={props.name}
						bind:value={$formData.status}
						options={statusOptions}
						ariaDescribedBy={props['aria-describedby']}
						invalid={props['aria-invalid'] === 'true'}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	{#key $formData.type}
		{#if needsBilling}
			<div class="grid gap-4 sm:grid-cols-2">
				<Form.Field form={itemForm} name="billing_cycle">
					<Form.Control id="billing_cycle">
						{#snippet children({ props })}
							<Form.Label>Billing cycle</Form.Label>
							<FormSelect
								id={props.id}
								name={props.name}
								bind:value={$billingCycle}
								options={billingCycleOptions}
								ariaDescribedBy={props['aria-describedby']}
								invalid={props['aria-invalid'] === 'true'}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field form={itemForm} name="billing_anchor_date">
					<Form.Control id="billing_anchor_date">
						{#snippet children({ props })}
							<Form.Label>Billing anchor date</Form.Label>
							<DatePicker
								id={props.id}
								name={props.name}
								min="1900-01-01"
								max="2100-12-31"
								bind:value={$billingAnchorDate}
								ariaDescribedBy={props['aria-describedby']}
								invalid={props['aria-invalid'] === 'true'}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			{#if needsCustomDays}
				<Form.Field form={itemForm} name="custom_cycle_days">
					<Form.Control id="custom_cycle_days">
						{#snippet children({ props })}
							<Form.Label>Every (days)</Form.Label>
							<Input
								{...props}
								type="number"
								min="1"
								max="3650"
								step="1"
								required
								bind:value={$customCycleDays}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			{/if}
		{/if}
	{/key}

	{#key $formData.type}
		{#if needsExpiry}
			<Form.Field form={itemForm} name="expiry_date">
				<Form.Control id="expiry_date">
					{#snippet children({ props })}
						<Form.Label>Expiry date</Form.Label>
						<DatePicker
							id={props.id}
							name={props.name}
							min="1900-01-01"
							max="2100-12-31"
							bind:value={$expiryDate}
							ariaDescribedBy={props['aria-describedby']}
							invalid={props['aria-invalid'] === 'true'}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		{/if}
	{/key}

	<div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
		<Form.Field form={itemForm} name="amount">
			<Form.Control id="amount">
				{#snippet children({ props })}
					<Form.Label>Amount</Form.Label>
					<Input
						{...props}
						type="number"
						min="0"
						max="9999999999.99"
						step="0.01"
						bind:value={$amount}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field form={itemForm} name="currency">
			<Form.Control id="currency">
				{#snippet children({ props })}
					<Form.Label>Currency</Form.Label>
					<FormSelect
						id={props.id}
						name={props.name}
						bind:value={$currency}
						options={currencyOptions}
						ariaDescribedBy={props['aria-describedby']}
						invalid={props['aria-invalid'] === 'true'}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<Form.Field form={itemForm} name="category">
			<Form.Control id="category">
				{#snippet children({ props })}
					<Form.Label>Category</Form.Label>
					<Input {...props} maxlength={200} bind:value={$category} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field form={itemForm} name="provider">
			<Form.Control id="provider">
				{#snippet children({ props })}
					<Form.Label>Provider</Form.Label>
					<Input {...props} maxlength={200} bind:value={$provider} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<Form.Field form={itemForm} name="notes">
		<Form.Control id="notes">
			{#snippet children({ props })}
				<Form.Label>Notes</Form.Label>
				<Textarea {...props} maxlength={5000} rows={4} bind:value={$notes} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	{#if $errors._errors?.[0]}
		<p
			class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
			role="alert"
		>
			{$errors._errors[0]}
		</p>
	{/if}

	<Button type="submit" class="min-h-11 w-full sm:w-auto" disabled={$submitting}>
		{$submitting ? `${submitLabel}...` : submitLabel}
	</Button>
</form>
