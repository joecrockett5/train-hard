<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { BodyWeight } from '$lib/types';
	import ConfirmDelete from './confirm-delete-body-weight.svelte';
	import { formatWeight, UNIT } from '$lib/weight-chart';

	export let entry: BodyWeight;
	// Only reachable through the edit dialog, which `brief` hides, so
	// callers rendering a brief card legitimately omit it.
	export let deletionCallback: (entry: BodyWeight) => void = () => {};
	export let brief: boolean = false;

	let updatedWeight = entry.weight;
	let updatedNotes = entry.notes;

	$: formattedDate = new Date(`${entry.entryDate}T00:00:00Z`).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});

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
				weight: Number(updatedWeight),
				notes: updatedNotes
			})
		});

		if (!response.ok) {
			console.error('Failed to update weigh-in: ', entry);
		} else {
			entry.weight = Number(updatedWeight);
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
			<Dialog.Content class="w-3/4 max-w-lg">
				<Dialog.Header>
					<Dialog.Title>Edit weigh-in</Dialog.Title>
					<Dialog.Description>{formattedDate}</Dialog.Description>
				</Dialog.Header>
				<label for="weight">Weight ({UNIT})</label>
				<Input type="number" step="0.1" placeholder="Weight" bind:value={updatedWeight} />
				<label for="notes">Notes</label>
				<Input placeholder="Notes" bind:value={updatedNotes} />
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
		<Card.Title>{formatWeight(entry.weight)}{UNIT}</Card.Title>
		<Card.Description>{formattedDate}</Card.Description>
	</Card.Header>
	{#if entry.notes}
		<Card.Content>
			<span class="text-sm font-semibold">Notes</span>
			<p>{entry.notes}</p>
		</Card.Content>
	{/if}
</Card.Root>
