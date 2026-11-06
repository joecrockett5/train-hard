<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import PhotoImage from '$lib/components/PhotoImage.svelte';
	import {
		choosePhoto,
		clampChosen,
		comparableWeighIns,
		weighInById,
		widestPair,
		type Chosen,
		type Side
	} from '$lib/photo-comparison';
	import { displayWeight } from '$lib/units';
	import { preferences } from '$lib/preferences.svelte';
	import { compactDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	/**
	 * Two dates' photos, side by side.
	 *
	 * Its own route rather than a mode on the weight screen: that screen
	 * already carries a chart, a pager and a list, all of which this would
	 * have to hide, and the pair being compared is state of its own.
	 *
	 * Two columns at any width -- side by side is the whole point, and
	 * stacking them would put the earlier photo off screen. Each image is
	 * fitted inside an identical box rather than cropped to fill it: a crop
	 * would trim exactly the waistline the photos were taken to show, and
	 * identical boxes keep the two bodies to the same scale.
	 */
	let { data }: { data: PageData } = $props();

	const prefs = preferences();

	/*
	 * Built once from the load. Nothing on this screen writes a weigh-in or a
	 * photo -- it only chooses between them -- so there is nothing for it to
	 * follow.
	 */
	// svelte-ignore state_referenced_locally
	const comparable = comparableWeighIns(data.bodyWeights, data.photos);
	const pair = widestPair(comparable);

	// Oldest and newest to begin with, which is the most change there is to
	// see. Null when fewer than two dates have photos.
	let earlierId = $state(pair?.earlierId ?? '');
	let laterId = $state(pair?.laterId ?? '');
	let chosen = $state<Chosen>({ earlier: 0, later: 0 });

	/**
	 * Whether choosing a photo on one side moves the other to match.
	 *
	 * Linked is right for photos taken in one session in the usual order,
	 * which is the common case and as close to pairing by angle as the data
	 * allows -- a photo records no angle. Unlinking is the way out when the
	 * order differs.
	 */
	let linked = $state(true);

	const earlier = $derived(weighInById(comparable, earlierId));
	const later = $derived(weighInById(comparable, laterId));
	const counts = $derived({
		earlier: earlier?.photos.length ?? 0,
		later: later?.photos.length ?? 0
	});

	// A new date brings a different number of photos with it, so a position
	// left over from the last one can point past the end of this one.
	$effect(() => {
		const current = counts;
		chosen = clampChosen(chosen, current);
	});

	const sides = $derived([
		{ side: 'earlier' as Side, label: t.bodyWeight.earlier, weighIn: earlier },
		{ side: 'later' as Side, label: t.bodyWeight.later, weighIn: later }
	]);

	// Only worth offering while there is something to switch between.
	const switchable = $derived(counts.earlier > 1 || counts.later > 1);

	function pick(side: Side, index: number) {
		chosen = choosePhoto(chosen, side, index, counts, linked);
	}
</script>

<svelte:head>
	<title>{t.app.name} · {t.bodyWeight.compareTitle}</title>
</svelte:head>

<header class="screen-head">
	<Button variant="ghost" size="sm" icon="arrowLeft" href="/body-weight" class="back">
		{t.bodyWeight.backToWeighIns}
	</Button>
	<div>
		<h1>{t.bodyWeight.compareTitle}</h1>
		<p>{t.bodyWeight.compareSubtitle}</p>
	</div>
</header>

{#if !pair}
	<Card>
		<EmptyState icon="images" title={t.bodyWeight.compareEmpty} />
	</Card>
{:else}
	<Card>
		<!--
			Native selects rather than a styled dropdown: on a phone this is
			the system picker, which scrolls a year of dates in one gesture and
			needs no scrolling list of our own.
		-->
		<div class="dates">
			<div>
				<label for="earlier-date">{t.bodyWeight.earlier}</label>
				<select id="earlier-date" bind:value={earlierId}>
					{#each comparable as option (option.entry.objectId)}
						<option value={option.entry.objectId}>{compactDate(option.entry.entryDate)}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="later-date">{t.bodyWeight.later}</label>
				<select id="later-date" bind:value={laterId}>
					{#each comparable as option (option.entry.objectId)}
						<option value={option.entry.objectId}>{compactDate(option.entry.entryDate)}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="pair">
			{#each sides as { side, weighIn } (side)}
				<!--
					Indexed here rather than through a helper: what the markup
					reads is what it tracks, so a helper reaching for `chosen`
					itself would leave this image on whichever photo it first
					rendered.
				-->
				{@const photo = weighIn?.photos[chosen[side]] ?? null}
				<div class="side">
					<div class="frame">
						{#if photo}
							<PhotoImage
								{photo}
								alt={weighIn ? t.photos.fromDate(compactDate(weighIn.entry.entryDate)) : ''}
								explain
								class="shot"
							/>
						{/if}
					</div>
					{#if weighIn}
						<p class="weight tnum">{displayWeight(weighIn.entry.weight, prefs.weightUnit)}</p>
						<p class="when">{compactDate(weighIn.entry.entryDate)}</p>

						{#if weighIn.photos.length > 1}
							<div class="strip">
								{#each weighIn.photos as thumbnail, index (thumbnail.objectId)}
									<button
										type="button"
										class="thumb"
										class:current={index === chosen[side]}
										aria-label={t.bodyWeight.showPhoto(index + 1)}
										aria-pressed={index === chosen[side]}
										onclick={() => pick(side, index)}
									>
										<PhotoImage photo={thumbnail} class="thumb-img" />
									</button>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		{#if switchable}
			<Button
				variant="ghost"
				size="sm"
				icon={linked ? 'link' : 'unlink'}
				pressed={linked}
				onclick={() => (linked = !linked)}
				class="link-toggle"
			>
				{linked ? t.bodyWeight.linked : t.bodyWeight.unlinked}
			</Button>
		{/if}
	</Card>
{/if}

<style>
	.screen-head {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.screen-head :global(.back) {
		align-self: flex-start;
		margin-left: calc(-1 * var(--space-3));
	}

	h1 {
		font-size: var(--text-xl);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.screen-head p {
		font-size: var(--text-sm);
		color: var(--ink-subtle);
	}

	.dates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	label {
		display: block;
		margin-bottom: var(--space-1);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--ink-muted);
	}

	select {
		width: 100%;
		min-height: var(--touch);
		padding: 0 var(--space-2);
		background: var(--surface-sunken);
		border: 1px solid var(--field-line);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.frame {
		aspect-ratio: 3 / 4;
		width: 100%;
		overflow: hidden;
		border-radius: var(--radius-md);
		background: var(--surface-sunken);
	}

	:global(.shot) {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.weight {
		margin-top: var(--space-2);
		font-size: var(--text-base);
		font-weight: 700;
	}

	.when {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.strip {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-1);
		margin-top: var(--space-2);
	}

	.thumb {
		border-radius: var(--radius-sm);
		overflow: hidden;
		outline-offset: 2px;
	}

	.thumb.current {
		outline: 2px solid var(--brand);
	}

	:global(.thumb-img) {
		aspect-ratio: 1;
		width: 100%;
		object-fit: cover;
	}

	:global(.link-toggle) {
		margin-top: var(--space-3);
		margin-left: calc(-1 * var(--space-3));
	}
</style>
