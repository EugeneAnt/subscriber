<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { cn } from '$lib/utils';

	type Props = {
		id: string;
		name: string;
		align?: 'start' | 'center' | 'end';
		class?: string;
		deleteAction?: string;
	};

	let { id, name, align = 'end', class: className, deleteAction = '?/delete' }: Props = $props();

	let deleteOpen = $state(false);
	const editHref = $derived(resolve('/(app)/items/[id]', { id }));
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="icon"
				class={cn('min-h-11 min-w-11', className)}
				aria-label={`Open actions for ${name}`}
			>
				<MoreHorizontalIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-36" {align}>
		<DropdownMenu.Item onSelect={() => goto(editHref)}>
			<PencilIcon />
			Edit
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item variant="destructive" onSelect={() => (deleteOpen = true)}>
			<Trash2Icon />
			Delete
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete {name}?</AlertDialog.Title>
			<AlertDialog.Description>
				This removes the item from the dashboard. This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<form method="POST" action={deleteAction}>
				<input type="hidden" name="id" value={id} />
				<AlertDialog.Action type="submit" variant="destructive">Delete item</AlertDialog.Action>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
