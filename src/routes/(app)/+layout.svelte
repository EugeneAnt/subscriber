<script lang="ts">
	let { children, data } = $props();
</script>

<header class="border-b">
	<div class="container mx-auto flex items-center justify-between p-4">
		<a href="/" class="font-semibold">Subscriber</a>
		<form method="POST" action="/logout">
			<button class="text-sm underline" type="submit"
				>Sign out ({data.user?.email ?? 'Unknown'})</button
			>
		</form>
	</div>
</header>
<main class="container mx-auto p-4 pb-safe">
	{@render children()}
</main>
