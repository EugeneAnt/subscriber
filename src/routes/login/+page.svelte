<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { form } = $props();
</script>

<svelte:head>
	<title>Sign in - Subscriber</title>
</svelte:head>

<main class="container mx-auto max-w-md p-4 pt-12">
	<h1 class="mb-6 text-2xl font-semibold">Sign in</h1>

	<form method="POST" class="space-y-4">
		<div class="space-y-2">
			<Label for="email">Email</Label>
			<Input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
			/>
		</div>

		<div class="space-y-2">
			<Label for="password">Password</Label>
			<Input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/>
		</div>

		{#if form?.error}
			<p class="text-sm text-red-600" role="alert">{form.error}</p>
		{/if}

		<Button type="submit" class="w-full">Sign in</Button>
	</form>
</main>
