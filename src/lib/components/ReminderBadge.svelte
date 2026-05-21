<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';

	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	type Props = {
		count: number;
	};

	let { count }: Props = $props();
</script>

<Button
	href="/reminders"
	variant="ghost"
	size="icon"
	class={cn('relative min-h-11 min-w-11', count > 0 && 'text-foreground')}
	aria-label={count > 0 ? `${count} unread reminders` : 'Reminders'}
>
	<BellIcon class="size-5" />
	{#if count > 0}
		<span
			class="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground"
		>
			{count > 99 ? '99+' : count}
		</span>
	{/if}
</Button>
