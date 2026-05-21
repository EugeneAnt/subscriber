<script lang="ts">
	import { resolve } from '$app/paths';
	import ItemForm from '$lib/components/ItemForm.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { buttonVariants } from '$lib/components/ui/button';

	let { data, form: actionData } = $props();
	const form = $derived(actionData?.form ?? data.form);
</script>

<svelte:head>
	<title>Edit {data.row.name} — Subscriber</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-4">
	<a href={resolve('/')} class="text-sm text-muted-foreground hover:underline">Back to dashboard</a>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-semibold">Edit {data.row.name}</h1>

		<AlertDialog.Root>
			<AlertDialog.Trigger class={`${buttonVariants({ variant: 'destructive' })} min-h-11`}>
				Delete
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Delete {data.row.name}?</AlertDialog.Title>
					<AlertDialog.Description>
						This removes the item from the dashboard. This action cannot be undone.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<form method="POST" action="?/delete">
						<AlertDialog.Action type="submit" variant="destructive">Delete item</AlertDialog.Action>
					</form>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	</div>

	<ItemForm
		{form}
		action="?/update"
		submitLabel="Save"
		currencies={data.currencies}
		hiddenUpdatedAt={data.row.updated_at}
	/>
</div>
