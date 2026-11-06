<script lang="ts">
	import type { BodyWeight } from '$lib/types';
	import { buildChart, CHART_HEIGHT, CHART_WIDTH, summarise } from '$lib/weight-chart';
	import { formatWeight, toDisplayWeight } from '$lib/units';
	import { preferences } from '$lib/preferences.svelte';
	import { shortDate, mediumDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';

	/**
	 * The body weight graph.
	 *
	 * Hand-written SVG, with the scaling and the axis arithmetic in
	 * `$lib/weight-chart.ts` so both can be tested without rendering
	 * anything. No charting library: the app has one chart, and the geometry
	 * that makes it correct -- points spaced by elapsed days rather than
	 * evenly, so a gap in the record looks like a gap -- is the part a library
	 * would have to be configured into doing anyway.
	 *
	 * One series, so no legend: the card's own title names it.
	 */
	type Props = { entries: BodyWeight[]; compact?: boolean };

	let { entries, compact = false }: Props = $props();

	const prefs = preferences();
	const unit = $derived(prefs.weightUnit);

	// Stored in kilograms, plotted in whatever the profile is showing, so the
	// axis and the summary both move when the unit is toggled.
	const shown = $derived(
		entries.map((entry) => ({ ...entry, weight: toDisplayWeight(entry.weight, unit) }))
	);
	const chart = $derived(buildChart(shown));
	const summary = $derived(summarise(shown));

	/** The point under the pointer, or the last one it was near. */
	let active = $state<number | null>(null);
	let svg = $state<SVGSVGElement>();

	function track(event: PointerEvent) {
		if (!chart || !svg) {
			return;
		}

		const box = svg.getBoundingClientRect();
		// Into viewBox units, so the hit test does not care how wide the card is.
		const x = ((event.clientX - box.left) / box.width) * CHART_WIDTH;

		let nearest = 0;
		for (let index = 1; index < chart.points.length; index++) {
			if (Math.abs(chart.points[index].x - x) < Math.abs(chart.points[nearest].x - x)) {
				nearest = index;
			}
		}

		active = nearest;
	}

	const hovered = $derived(chart && active !== null ? chart.points[active] : null);
</script>

<figure class="chart" class:compact>
	<figcaption>
		<h2>{t.bodyWeight.chartTitle}</h2>
		<p>
			{#if summary}
				{t.bodyWeight.chartSummary(
					`${formatWeight(summary.current)}${unit}`,
					shortDate(summary.latest.entryDate)
				)}
				{#if summary.change !== null}
					·
					{t.bodyWeight.chartChange(
						`${summary.change >= 0 ? '+' : '−'}${formatWeight(Math.abs(summary.change))}${unit}`
					)}
				{/if}
			{:else}
				{t.bodyWeight.chartOverTime}
			{/if}
		</p>
	</figcaption>

	{#if chart}
		<div class="plot">
			<svg
				bind:this={svg}
				viewBox="0 0 {CHART_WIDTH} {CHART_HEIGHT}"
				role="img"
				aria-label={t.bodyWeight.chartLabel(unit)}
				onpointermove={track}
				onpointerleave={() => (active = null)}
			>
				<defs>
					<!--
						The brand ramp, in user space rather than per element, so the
						line, the fill beneath it and every point sample one gradient
						across the whole plot instead of each repeating it within its
						own bounding box.
					-->
					<linearGradient
						id="weight-chart-ramp"
						gradientUnits="userSpaceOnUse"
						x1={chart.plot.left}
						x2={chart.plot.right}
						y1="0"
						y2="0"
					>
						<stop offset="0" stop-color="var(--chart-from)" />
						<stop offset="1" stop-color="var(--chart-to)" />
					</linearGradient>
				</defs>

				{#each chart.yTicks as tick (tick.value)}
					<line x1={chart.plot.left} x2={chart.plot.right} y1={tick.y} y2={tick.y} class="grid" />
					<text x={chart.plot.left - 8} y={tick.y + 4} text-anchor="end" class="axis">
						{formatWeight(tick.value)}
					</text>
				{/each}

				{#if !compact}
					{#each chart.xTicks as tick (tick.date)}
						<text x={tick.x} y={chart.plot.bottom + 18} text-anchor="middle" class="axis">
							{shortDate(tick.date)}
						</text>
					{/each}
				{/if}

				{#if chart.area}
					<path d={chart.area} fill="url(#weight-chart-ramp)" fill-opacity="0.12" />
				{/if}

				<path
					d={chart.path}
					fill="none"
					stroke="url(#weight-chart-ramp)"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>

				{#if hovered}
					<line
						x1={hovered.x}
						x2={hovered.x}
						y1={chart.plot.top}
						y2={chart.plot.bottom}
						class="crosshair"
					/>
				{/if}

				{#each chart.points as point, index (point.entry.objectId ?? index)}
					<circle
						cx={point.x}
						cy={point.y}
						r={index === active ? 6 : 3.5}
						fill="url(#weight-chart-ramp)"
						class="point"
					/>
				{/each}
			</svg>

			{#if hovered}
				<!--
					Positioned as a percentage of the plot rather than in pixels, so
					it follows the point at any card width, and flipped past the
					halfway mark so it never runs off the right edge.
				-->
				<div
					class="tip"
					style="left: {(hovered.x / CHART_WIDTH) * 100}%; --flip: {hovered.x > CHART_WIDTH / 2
						? '-100%'
						: '0%'}"
				>
					<strong>{formatWeight(hovered.weight)}{unit}</strong>
					<span>{mediumDate(hovered.entry.entryDate)}</span>
				</div>
			{/if}
		</div>

		<!--
			The same numbers, for anyone the picture does not serve: a screen
			reader, a printout, forced colours.
		-->
		<table class="sr-only">
			<caption>{t.bodyWeight.chartLabel(unit)}</caption>
			<thead>
				<tr><th scope="col">{t.common.date}</th><th scope="col">{t.bodyWeight.title}</th></tr>
			</thead>
			<tbody>
				{#each chart.points as point, index (point.entry.objectId ?? index)}
					<tr>
						<td>{mediumDate(point.entry.entryDate)}</td>
						<td>{formatWeight(point.weight)}{unit}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="empty">{t.bodyWeight.none}</p>
	{/if}
</figure>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	figcaption h2 {
		font-size: var(--text-base);
	}

	figcaption p {
		margin-top: 2px;
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}

	.plot {
		position: relative;
	}

	svg {
		width: 100%;
		height: auto;
		overflow: visible;
		touch-action: pan-y;
	}

	.compact svg {
		max-height: 7rem;
	}

	.grid {
		stroke: var(--line);
		stroke-width: 1;
	}

	.crosshair {
		stroke: var(--ink-subtle);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.axis {
		fill: var(--ink-subtle);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.point {
		transition: r var(--dur-fast) var(--ease);
	}

	.tip {
		position: absolute;
		top: 0;
		transform: translateX(var(--flip));
		display: flex;
		flex-direction: column;
		padding: var(--space-1) var(--space-2);
		background: var(--surface-overlay);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-2);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		pointer-events: none;
	}

	.tip span {
		color: var(--ink-subtle);
	}

	.empty {
		padding: var(--space-8) 0;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}
</style>
