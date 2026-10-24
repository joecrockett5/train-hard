<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import Link2 from 'lucide-svelte/icons/link-2';
	import Unlink2 from 'lucide-svelte/icons/unlink-2';
	import {
		choosePhoto,
		clampChosen,
		comparableWeighIns,
		weighInById,
		widestPair,
		type Chosen,
		type Counts,
		type Side
	} from '$lib/photo-comparison';
	import { displayWeight, weightUnit } from '$lib/units';
	import type { BodyWeight, ProgressPhoto } from '$lib/types';

	/**
	 * Two dates' photos, side by side.
	 *
	 * Its own route rather than a mode on the weights page: that page already
	 * carries a chart, a pager and a list, all of which this would have to
	 * hide, and the pair being compared is state of its own.
	 *
	 * Mobile first, like the rest of the app. The pair is two columns at any
	 * width -- side by side is the whole point, and stacking them would put
	 * the earlier photo off screen. Each image is fitted inside an identical
	 * box rather than cropped to fill it: a crop would trim exactly the
	 * waistline the photos were taken to show, and identical boxes keep the
	 * two bodies to the same scale.
	 */

	export let data;

	const entries: BodyWeight[] = data.bodyWeights;
	const photos: ProgressPhoto[] = data.photos;

	const comparable = comparableWeighIns(entries, photos);
	const pair = widestPair(comparable);

	// Oldest and newest to begin with, which is the most change there is to
	// see. Null when fewer than two dates have photos, and the empty state
	// below stands in for the whole screen.
	let earlierId = pair?.earlierId ?? '';
	let laterId = pair?.laterId ?? '';

	let chosen: Chosen = { earlier: 0, later: 0 };
	/**
	 * Whether choosing a photo on one side moves the other to match.
	 *
	 * Linked is right for photos taken in one session in the usual order,
	 * which is the common case and is as close to pairing by angle as the
	 * data allows -- a photo records no angle. Unlinking is the way out when
	 * the order differs.
	 */
	let linked = true;

	$: earlier = weighInById(comparable, earlierId);
	$: later = weighInById(comparable, laterId);
	$: counts = { earlier: earlier?.photos.length ?? 0, later: later?.photos.length ?? 0 };

	// A new date brings a different number of photos with it, so a position
	// left over from the last one can point past the end of this one.
	//
	// Through a function so that this reacts to `counts` alone: reading
	// `chosen` in the reactive statement itself would make it a dependency of
	// a statement that assigns to it, and the fresh object every run would
	// then retrigger it forever.
	$: reclamp(counts);

	function reclamp(current: Counts) {
		chosen = clampChosen(chosen, current);
	}

	$: sides = [
		{ side: 'earlier' as Side, weighIn: earlier },
		{ side: 'later' as Side, weighIn: later }
	];

	// Only worth offering while there is something to switch between.
	$: switchable = counts.earlier > 1 || counts.later > 1;

	/** Matched to the app's `Input`, which has no select of its own. */
	const SELECT_CLASS =
		'border-input bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2';

	function source(photo: ProgressPhoto): string {
		return `/api/progress-photos/${photo.objectId}/file`;
	}

	/** `2026-10-17` as `17 Oct 26`: a year of weigh-ins needs the year. */
	function label(entry: BodyWeight): string {
		return new Date(`${entry.entryDate}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: '2-digit',
			timeZone: 'UTC'
		});
	}

	function pick(side: Side, index: number) {
		chosen = choosePhoto(chosen, side, index, counts, linked);
	}
</script>

<svelte:head>
	<title>hard: Compare Photos</title>
</svelte:head>

<Card.Root class="mt-4">
	<Card.Header>
		<Card.Title>Compare</Card.Title>
		<Card.Description>Two dates' progress photos, side by side</Card.Description>
	</Card.Header>
</Card.Root>

{#if !pair}
	<Card.Root class="mt-4">
		<Card.Content class="text-muted-foreground pt-6 text-sm">
			<p>
				Two weigh-ins need photos before there is anything to compare. Add them from the weights
				page.
			</p>
		</Card.Content>
	</Card.Root>
{:else}
	<Card.Root class="mt-4">
		<Card.Content class="pt-6">
			<!--
				Native selects rather than a styled dropdown: on a phone this
				is the system picker, which scrolls a year of dates in one
				gesture and needs no scrolling list of our own.
			-->
			<div class="grid grid-cols-2 gap-2">
				<div>
					<label class="text-muted-foreground mb-1 block text-xs" for="earlier-date">Earlier</label>
					<select id="earlier-date" class={SELECT_CLASS} bind:value={earlierId}>
						{#each comparable as option (option.entry.objectId)}
							<option value={option.entry.objectId}>{label(option.entry)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="text-muted-foreground mb-1 block text-xs" for="later-date">Later</label>
					<select id="later-date" class={SELECT_CLASS} bind:value={laterId}>
						{#each comparable as option (option.entry.objectId)}
							<option value={option.entry.objectId}>{label(option.entry)}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="mt-3 grid grid-cols-2 gap-2">
				{#each sides as { side, weighIn } (side)}
					<!--
						Indexed here rather than through a helper: Svelte tracks what a
						markup expression names, not what a function it calls goes on to
						read, so a helper that reached for `chosen` itself would leave
						this image on whichever photo it first rendered.
					-->
					{@const photo = weighIn?.photos[chosen[side]] ?? null}
					<div>
						<div class="bg-muted aspect-[3/4] w-full overflow-hidden rounded-md">
							{#if photo}
								<img
									src={source(photo)}
									alt={`Progress photo from ${weighIn ? label(weighIn.entry) : ''}`}
									loading="lazy"
									width={photo.width || undefined}
									height={photo.height || undefined}
									class="h-full w-full object-contain"
								/>
							{/if}
						</div>
						{#if weighIn}
							<p class="mt-1 text-sm font-semibold">
								{displayWeight(weighIn.entry.weight, $weightUnit)}
							</p>
							<p class="text-muted-foreground text-xs">{label(weighIn.entry)}</p>
						{/if}

						{#if weighIn && weighIn.photos.length > 1}
							<div class="mt-2 grid grid-cols-3 gap-1">
								{#each weighIn.photos as thumbnail, index (thumbnail.objectId)}
									<button
										type="button"
										class={`overflow-hidden rounded ring-offset-1 ${
											index === chosen[side] ? 'ring-primary ring-2' : ''
										}`}
										aria-label={`Show photo ${index + 1}`}
										aria-pressed={index === chosen[side]}
										on:click={() => pick(side, index)}
									>
										<img
											src={source(thumbnail)}
											alt=""
											loading="lazy"
											class="aspect-square w-full object-cover"
										/>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if switchable}
				<Button
					variant="ghost"
					size="sm"
					class="text-muted-foreground mt-3 -ml-2 h-8 px-2"
					aria-pressed={linked}
					on:click={() => (linked = !linked)}
				>
					{#if linked}
						<Link2 class="mr-2 h-4 w-4" />
						Both sides follow
					{:else}
						<Unlink2 class="mr-2 h-4 w-4" />
						Each side on its own
					{/if}
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}

<Button href="/body-weight" variant="outline" class="mt-4 w-full">
	<ChevronLeft class="mr-2 h-4 w-4" />
	Back to weigh-ins
</Button>

<div class="mb-8" />
