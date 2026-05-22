<script lang="ts">
	import { page } from '$app/state';

	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>{page.status} — Subscriber</title>
</svelte:head>

<section class="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-4 py-12">
	<p class="text-sm font-medium text-muted-foreground">{page.status}</p>
	<div class="space-y-2">
		<h1 class="text-3xl font-semibold tracking-normal">Something went wrong</h1>
		<p class="text-muted-foreground">
			{page.error?.message ?? 'The page could not be loaded.'}
		</p>
	</div>
	<div class="flex flex-col gap-2 sm:flex-row">
		<Button href="/" class="min-h-11">Back to dashboard</Button>
		<Button href="/login" variant="outline" class="min-h-11">Sign in</Button>
	</div>
</section>
