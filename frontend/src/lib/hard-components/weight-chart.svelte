<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { BodyWeight } from '$lib/types';
	import { buildChart, CHART_HEIGHT, CHART_WIDTH, shortDate, summarise } from '$lib/weight-chart';
	import { formatWeight, toDisplayWeight, weightUnit } from '$lib/units';

	export let entries: BodyWeight[] = [];

	// Stored in kilograms, plotted in whatever the profile is showing, so the
	// axis and the summary both move when the unit is toggled.
	$: shown = entries.map((entry) => ({
		...entry,
		weight: toDisplayWeight(entry.weight, $weightUnit)
	}));
	$: chart = buildChart(shown);
	$: summary = summarise(shown);
</script>

<Card.Root class="mt-4">
	<Card.Header>
		<Card.Title>Progress</Card.Title>
		<Card.Description>
			{#if summary}
				{formatWeight(summary.current)}{$weightUnit} on {shortDate(summary.latest.entryDate)}
				{#if summary.change !== null}
					· {summary.change >= 0 ? '+' : '−'}{formatWeight(Math.abs(summary.change))}{$weightUnit}
					since the first entry
				{/if}
			{:else}
				Weight over time
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if chart}
			<svg
				viewBox="0 0 {CHART_WIDTH} {CHART_HEIGHT}"
				class="h-auto w-full overflow-visible"
				role="img"
				aria-label="Body weight over time, in {$weightUnit}"
			>
				<defs>
					<!--
						The logo's ramp, red on the left to orange on the right. In user
						space rather than per-element, so the line, the fill beneath it
						and every point sample one gradient across the whole plot
						instead of each repeating it within its own bounding box.
					-->
					<linearGradient
						id="weight-chart-brand"
						gradientUnits="userSpaceOnUse"
						x1={chart.plot.left}
						x2={chart.plot.right}
						y1="0"
						y2="0"
					>
						<stop offset="0" style="stop-color: hsl(var(--chart-from))" />
						<stop offset="1" style="stop-color: hsl(var(--chart-to))" />
					</linearGradient>
				</defs>

				{#each chart.yTicks as tick}
					<line
						x1={chart.plot.left}
						x2={chart.plot.right}
						y1={tick.y}
						y2={tick.y}
						class="stroke-border"
						stroke-width="1"
					/>
					<text
						x={chart.plot.left - 8}
						y={tick.y + 4}
						text-anchor="end"
						class="fill-muted-foreground text-[13px]"
					>
						{formatWeight(tick.value)}
					</text>
				{/each}

				{#each chart.xTicks as tick}
					<text
						x={tick.x}
						y={chart.plot.bottom + 18}
						text-anchor="middle"
						class="fill-muted-foreground text-[13px]"
					>
						{tick.label}
					</text>
				{/each}

				{#if chart.area}
					<path d={chart.area} fill="url(#weight-chart-brand)" fill-opacity="0.12" />
				{/if}

				<path
					d={chart.path}
					fill="none"
					stroke="url(#weight-chart-brand)"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>

				{#each chart.points as point}
					<circle cx={point.x} cy={point.y} r="3.5" fill="url(#weight-chart-brand)">
						<title
							>{shortDate(point.entry.entryDate)}: {formatWeight(point.weight)}{$weightUnit}</title
						>
					</circle>
				{/each}
			</svg>
		{:else}
			<p class="text-muted-foreground py-8 text-center text-sm">
				No weigh-ins yet. Add one and it will be graphed here.
			</p>
		{/if}
	</Card.Content>
</Card.Root>
