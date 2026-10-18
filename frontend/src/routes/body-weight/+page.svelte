<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import BodyWeightEntry from '$lib/hard-components/body-weight-entry.svelte';
	import WeightChart from '$lib/hard-components/weight-chart.svelte';
	import { sortEntries, UNIT } from '$lib/weight-chart';
	import type { BodyWeight } from '$lib/types';

	export let data;

	let entries: BodyWeight[] = data.bodyWeights;

	// The chart reads oldest first; the list below reads newest first.
	$: oldestFirst = sortEntries(entries);
	$: newestFirst = oldestFirst.slice().reverse();

	function today(): string {
		return new Date().toLocaleDateString('en-CA');
	}

	let newDate = today();
	let newWeight = '';
	let newNotes = '';

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
				weight: Number(newWeight),
				notes: newNotes
			})
		});

		if (!response.ok) {
			console.error(`Unable to log a weight of ${newWeight}${UNIT}`);
			return;
		}

		const created: BodyWeight = await response.json();
		entries = [...entries, created];

		newDate = today();
		newWeight = '';
		newNotes = '';
	}

	async function deleteEntry(entry: BodyWeight) {
		const response = await fetch(`/api/body-weights/${entry.objectId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			console.error('Failed to delete weigh-in: ', entry);
		} else {
			entries = entries.filter((e: BodyWeight) => e.objectId !== entry.objectId);
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

<NewItem item="Weigh-in">
	<label for="date">Date</label>
	<Input type="date" bind:value={newDate} />
	<label for="weight">Weight ({UNIT})</label>
	<Input type="number" step="0.1" min="0" placeholder="Weight" bind:value={newWeight} />
	<label for="notes">Notes</label>
	<Input placeholder="Notes" bind:value={newNotes} />
	<br />
	<Dialog.Footer>
		<Dialog.Close class={buttonVariants({ variant: 'default' })} on:click={addEntry}
			>Add</Dialog.Close
		>
	</Dialog.Footer>
</NewItem>

{#each newestFirst as entry (entry.objectId)}
	<BodyWeightEntry {entry} deletionCallback={deleteEntry} />
{/each}

<div class="mb-8" />
