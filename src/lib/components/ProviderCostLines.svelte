<script lang="ts">
	type Line = {
		id?: string;
		external_project_id?: string | null;
		line_item?: string | null;
		amount: number | string;
		currency: string;
	};

	let { lines }: { lines: Line[] } = $props();

	function formatAmount(amount: number | string, currency: string): string {
		const value = Number(amount);
		if (!Number.isFinite(value)) return `${amount} ${currency}`;

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			maximumFractionDigits: 6
		}).format(value);
	}
</script>

{#if lines.length > 0}
	<details class="rounded-lg border p-3">
		<summary class="cursor-pointer text-sm font-medium">Line details</summary>
		<div class="mt-3 overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="text-muted-foreground">
					<tr>
						<th class="py-2 pr-3 font-medium">Project</th>
						<th class="py-2 pr-3 font-medium">Line item</th>
						<th class="py-2 text-right font-medium">Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each lines as line (line.id ?? `${line.external_project_id}-${line.line_item}-${line.amount}`)}
						<tr class="border-t">
							<td class="py-2 pr-3">{line.external_project_id ?? 'All projects'}</td>
							<td class="py-2 pr-3">{line.line_item ?? 'Unspecified'}</td>
							<td class="py-2 text-right tabular-nums">
								{formatAmount(line.amount, line.currency)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
{/if}
