<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { BodyWeight, ProgressPhoto } from '$lib/types';
	import ConfirmDelete from './confirm-delete-body-weight.svelte';
	import PhotoGallery from './photo-gallery.svelte';
	import PhotoPicker from './photo-picker.svelte';
	import { uploadPhotos } from '$lib/photos';
	import { createEventDispatcher } from 'svelte';
	import { formatWeight, toDisplayWeight, toStoredWeight, weightUnit } from '$lib/units';

	export let entry: BodyWeight;
	// Only reachable through the edit dialog, which `brief` hides, so
	// callers rendering a brief card legitimately omit it.
	export let deletionCallback: (entry: BodyWeight) => void = () => {};
	export let brief: boolean = false;
	/** This weigh-in's photos. The page owns the list; this one reports changes. */
	export let photos: ProgressPhoto[] = [];

	const dispatch = createEventDispatcher<{ added: ProgressPhoto[]; removed: ProgressPhoto }>();

	// Edited in the unit on screen, stored in kilograms.
	let updatedWeight = formatWeight(toDisplayWeight(entry.weight, $weightUnit));
	let updatedNotes = entry.notes;

	$: formattedDate = new Date(`${entry.entryDate}T00:00:00Z`).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});

	/** Uploads straight away: the weigh-in exists, so there is nothing to wait for. */
	async function addPhotos(picked: File[]) {
		const uploaded = await uploadPhotos(picked, entry.objectId ?? '');

		if (uploaded.length > 0) {
			dispatch('added', uploaded);
		}
	}

	async function removePhoto(photo: ProgressPhoto) {
		const response = await fetch(`/api/progress-photos/${photo.objectId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			console.error('Failed to remove photo: ', photo);
			return;
		}

		dispatch('removed', photo);
	}

	async function updateEntry() {
		const response = await fetch(`/api/body-weights/${entry.objectId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				timestamp: entry.timestamp,
				objectId: entry.objectId,
				entryDate: entry.entryDate,
				weight: toStoredWeight(Number(updatedWeight), $weightUnit),
				notes: updatedNotes
			})
		});

		if (!response.ok) {
			console.error('Failed to update weigh-in: ', entry);
		} else {
			entry.weight = toStoredWeight(Number(updatedWeight), $weightUnit);
			entry.notes = updatedNotes;
		}
	}
</script>

<Card.Root class="mt-4">
	{#if !brief}
		<Dialog.Root>
			<Dialog.Trigger class={`float-right top-4 right-4 ${buttonVariants({ variant: 'ghost' })}`}
				>Edit</Dialog.Trigger
			>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Edit weigh-in</Dialog.Title>
					<Dialog.Description>{formattedDate}</Dialog.Description>
				</Dialog.Header>
				<label for="weight">Weight ({$weightUnit})</label>
				<!-- `inputmode` asks iOS for the decimal pad; see the new weigh-in. -->
				<Input
					type="number"
					inputmode="decimal"
					step="0.01"
					placeholder="Weight"
					bind:value={updatedWeight}
				/>
				<label for="notes">Notes</label>
				<Input placeholder="Notes" bind:value={updatedNotes} />

				<!--
					Photos are files, written as they are picked rather than
					on Save -- the same as tags elsewhere, and for the same
					reason: there is nothing to batch them with.
				-->
				<PhotoPicker onPicked={addPhotos} />
				<PhotoGallery {photos} removalCallback={removePhoto} />
				<br />
				<Dialog.Footer class="flex flex-row gap-2">
					<ConfirmDelete {deletionCallback} {entry} />
					<Dialog.Close
						class={buttonVariants({ variant: 'default' }) + ' ml-auto'}
						on:click={updateEntry}>Save</Dialog.Close
					>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
	<Card.Header>
		<Card.Title>{formatWeight(toDisplayWeight(entry.weight, $weightUnit))}{$weightUnit}</Card.Title>
		<Card.Description>{formattedDate}</Card.Description>
	</Card.Header>
	{#if entry.notes || photos.length > 0}
		<Card.Content>
			{#if entry.notes}
				<span class="text-sm font-semibold">Notes</span>
				<p>{entry.notes}</p>
			{/if}
			{#if !brief}
				<PhotoGallery {photos} />
			{/if}
		</Card.Content>
	{/if}
</Card.Root>
