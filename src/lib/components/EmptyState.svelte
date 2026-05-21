<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	type Props = {
		title: string;
		body?: string;
		actionHref?: string;
		actionLabel?: string;
	};

	let { title, body, actionHref, actionLabel }: Props = $props();
</script>

<div class="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
	<p class="font-medium">{title}</p>
	{#if body}
		<p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
	{/if}
	{#if actionHref && actionLabel}
		<Button href={actionHref} class="mt-4 min-h-11">{actionLabel}</Button>
	{/if}
</div>
