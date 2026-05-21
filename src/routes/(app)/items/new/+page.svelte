<script lang="ts">
	import { resolve } from '$app/paths';
	import ItemForm from '$lib/components/ItemForm.svelte';

	let { data, form: actionData } = $props();
	const form = $derived(actionData?.form ?? data.form);
</script>

<svelte:head>
	<title>New item — Subscriber</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-4">
	<div>
		<a href={resolve('/')} class="text-sm text-muted-foreground hover:underline"
			>Back to dashboard</a
		>
		<h1 class="mt-2 text-2xl font-semibold">New item</h1>
	</div>

	<ItemForm {form} action="" submitLabel="Create" currencies={data.currencies} />
</div>
