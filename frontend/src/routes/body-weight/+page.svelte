<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import BodyWeightEntry from '$lib/hard-components/body-weight-entry.svelte';
	import WeightChart from '$lib/hard-components/weight-chart.svelte';
	import Pager, { PAGE_SIZE } from '$lib/hard-components/pager.svelte';
	import { sortEntries } from '$lib/weight-chart';
	import { toStoredWeight, weightUnit } from '$lib/units';
	import { todayIso } from '$lib/dates';
	import PhotoPicker from '$lib/hard-components/photo-picker.svelte';
	import { Button } from '$lib/components/ui/button';
	import Images from 'lucide-svelte/icons/images';
	import { uploadPhotos } from '$lib/photos';
	import { comparableWeighIns, widestPair } from '$lib/photo-comparison';
	import type { BodyWeight, ProgressPhoto } from '$lib/types';

	export let data;

	let entries: BodyWeight[] = data.bodyWeights;
	let photos: ProgressPhoto[] = data.photos;

	// One lookup for the list below, rebuilt whenever a photo is added or
	// removed so a card never has to ask for its own.
	$: photosByEntry = photos.reduce((grouped: Map<string, ProgressPhoto[]>, photo) => {
		const forEntry = grouped.get(photo.bodyWeightId) ?? [];
		forEntry.push(photo);
		grouped.set(photo.bodyWeightId, forEntry);
		return grouped;
	}, new Map());

	// Offered only when there are two dates to put side by side, which is
	// what the compare screen needs to show anything at all.
	$: comparable = widestPair(comparableWeighIns(entries, photos)) !== null;

	let page = 1;

	// The chart reads oldest first; the list below reads newest first. The
	// chart always plots every entry -- only the list below it is paged.
	$: oldestFirst = sortEntries(entries);
	$: newestFirst = oldestFirst.slice().reverse();
	$: viewableEntries = newestFirst.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	let newDate = todayIso();
	let newWeight = '';
	let newNotes = '';
	/** Held until the weigh-in exists, since a photo needs one to belong to. */
	let newPhotos: File[] = [];

	async function addEntry() {
		if (!newWeight || !newDate) {
			return;
		}

		const response = await fetch(`/api/body-weights`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				entryDate: newDate,
				weight: toStoredWeight(Number(newWeight), $weightUnit),
				notes: newNotes
			})
		});

		if (!response.ok) {
			console.error(`Unable to log a weight of ${newWeight}${$weightUnit}`);
			return;
		}

		const created: BodyWeight = await response.json();
		entries = [...entries, created];

		if (newPhotos.length > 0) {
			// The weigh-in is logged either way: a photo that fails to upload
			// is worth a line in the console, not losing the reading.
			photos = [...photos, ...(await uploadPhotos(newPhotos, created.objectId ?? ''))];
		}

		newDate = todayIso();
		newWeight = '';
		newNotes = '';
		newPhotos = [];
	}

	async function deleteEntry(entry: BodyWeight) {
		const response = await fetch(`/api/body-weights/${entry.objectId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			console.error('Failed to delete weigh-in: ', entry);
		} else {
			entries = entries.filter((e: BodyWeight) => e.objectId !== entry.objectId);
			// The backend deletes their files and rows with the weigh-in.
			photos = photos.filter((photo) => photo.bodyWeightId !== entry.objectId);
		}
	}
</script>

<svelte:head>
	<title>hard: Body Weight</title>
</svelte:head>

<Card.Root class="mt-4">
	<Card.Header>
		<Card.Title>Body Weight</Card.Title>
		<Card.Description>Every weigh-in for this profile</Card.Description>
	</Card.Header>
</Card.Root>

<WeightChart entries={oldestFirst} />

{#if comparable}
	<Button href="/body-weight/compare" variant="outline" class="mt-4 w-full text-gray-400">
		<Images class="mr-2 h-4 w-4" />
		Compare photos
	</Button>
{/if}

<NewItem item="Weigh-in">
	<label for="date">Date</label>
	<Input type="date" bind:value={newDate} />
	<label for="weight">Weight ({$weightUnit})</label>
	<Input type="number" step="0.01" min="0" placeholder="Weight" bind:value={newWeight} />
	<label for="notes">Notes</label>
	<Input placeholder="Notes" bind:value={newNotes} />
	<PhotoPicker bind:files={newPhotos} />
	<br />
	<Dialog.Footer>
		<Dialog.Close class={buttonVariants({ variant: 'default' })} on:click={addEntry}
			>Add</Dialog.Close
		>
	</Dialog.Footer>
</NewItem>

<Pager count={newestFirst.length} bind:page />

{#each viewableEntries as entry (entry.objectId)}
	<BodyWeightEntry
		{entry}
		deletionCallback={deleteEntry}
		photos={photosByEntry.get(entry.objectId ?? '') ?? []}
		on:added={(event) => (photos = [...photos, ...event.detail])}
		on:removed={(event) =>
			(photos = photos.filter((photo) => photo.objectId !== event.detail.objectId))}
	/>
{/each}

<div class="mb-8" />

<Pager count={newestFirst.length} bind:page />
