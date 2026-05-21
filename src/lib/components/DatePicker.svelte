<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import {
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		type DateValue
	} from '@internationalized/date';

	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils.js';

	type Props = {
		id: string;
		name: string;
		value?: string | null;
		min?: string;
		max?: string;
		invalid?: boolean;
		placeholder?: string;
		class?: string;
	};

	let {
		id,
		name,
		value = null,
		min = '1900-01-01',
		max = '2100-12-31',
		invalid = false,
		placeholder = 'Select date',
		class: className
	}: Props = $props();

	const formatter = new DateFormatter('en-US', { dateStyle: 'medium' });

	let open = $state(false);
	// The form owns the initial value; after mount, the picker owns in-progress edits.
	// svelte-ignore state_referenced_locally
	let selected = $state<DateValue | undefined>(parseIsoDate(value));

	const minValue = $derived(parseIsoDate(min));
	const maxValue = $derived(parseIsoDate(max));
	const isoValue = $derived(selected?.toString() ?? '');
	const displayValue = $derived(
		selected ? formatter.format(selected.toDate(getLocalTimeZone())) : placeholder
	);

	function parseIsoDate(iso: string | null | undefined): DateValue | undefined {
		if (!iso) return undefined;

		try {
			return parseDate(iso);
		} catch {
			return undefined;
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger {id}>
		{#snippet child({ props })}
			<Button
				{...props}
				type="button"
				variant="outline"
				aria-invalid={invalid ? 'true' : undefined}
				class={cn(
					'h-11 w-full justify-start text-start text-base font-normal',
					!selected && 'text-muted-foreground',
					className
				)}
			>
				<CalendarIcon class="mr-2 size-4 shrink-0" />
				<span class="truncate">{displayValue}</span>
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-auto overflow-hidden p-0" align="start">
		<Calendar
			type="single"
			bind:value={selected}
			{minValue}
			{maxValue}
			captionLayout="dropdown"
			onValueChange={() => {
				open = false;
			}}
		/>
	</Popover.Content>
</Popover.Root>

<input type="hidden" {name} value={isoValue} />
