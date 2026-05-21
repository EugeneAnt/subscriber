<script lang="ts" module>
	export type FormSelectOption = {
		value: string;
		label: string;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils.js';

	type Props = {
		id?: string;
		name: string;
		value?: string;
		options: FormSelectOption[];
		placeholder?: string;
		ariaLabel?: string;
		ariaDescribedBy?: string;
		invalid?: boolean;
		class?: string;
		contentClass?: string;
	};

	let {
		id,
		name,
		value = $bindable(''),
		options,
		placeholder = 'Select an option',
		ariaLabel,
		ariaDescribedBy,
		invalid = false,
		class: className,
		contentClass
	}: Props = $props();

	const selectedLabel = $derived(
		options.find((option) => option.value === value)?.label ?? placeholder
	);
</script>

<Select.Root type="single" {name} bind:value>
	<Select.Trigger
		{id}
		aria-label={ariaLabel}
		aria-describedby={ariaDescribedBy}
		aria-invalid={invalid ? 'true' : undefined}
		class={cn('w-full', className)}
	>
		{selectedLabel}
	</Select.Trigger>
	<Select.Content class={contentClass}>
		<Select.Group>
			{#each options as option (option.value)}
				<Select.Item value={option.value} label={option.label} disabled={option.disabled}>
					{option.label}
				</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
