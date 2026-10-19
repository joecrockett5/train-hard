<script lang="ts">
	import InlineSetEdit from '$lib/hard-components/inline-set-edit.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import { buttonVariants } from '$lib/components/ui/button';
	import type { Set } from '$lib/types';
	import ConfirmDelete from '$lib/hard-components/confirm-delete-set.svelte';
	import Tick from '$lib/svg/tick.svelte';
	import Cross from '$lib/svg/cross.svelte';
	import Dash from '$lib/svg/dash.svelte';
	import {
		displayWeight,
		formatDuration,
		formatWeight,
		toDisplayWeight,
		toStoredWeight,
		weightUnit
	} from '$lib/units';

	export let set: Set;
	export let deletionCallback: (set: Set) => void;
	export let brief = false;
	export let display: number | undefined = undefined;
	/** A timed exercise's sets show minutes rather than reps at a weight. */
	export let timed = false;

	// Edited in the unit on screen; stored in kilograms.
	let updatedWeight = Number(formatWeight(toDisplayWeight(set.weight, $weightUnit)));
	let updatedReps = set.reps;
	let updatedDuration = set.duration ?? 0;
	let updatedNotes = set.notes;

	async function updateSet() {
		const response = await fetch(`/api/sets/${set.objectId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				timestamp: set.timestamp,
				objectId: set.objectId,
				setType: set.setType,
				weight: toStoredWeight(Number(updatedWeight), $weightUnit),
				weightUnit: 'kg',
				reps: updatedReps,
				duration: updatedDuration,
				notes: updatedNotes,
				exerciseJoinId: set.exerciseJoinId
			})
		});

		if (!response.ok) {
			console.error('Failed to update set: ', set);
		} else {
			set.weight = toStoredWeight(Number(updatedWeight), $weightUnit);
			set.reps = updatedReps;
			set.duration = updatedDuration;
			set.notes = updatedNotes;
		}
	}
</script>

<Card.Root class="w-full mt-2">
	<div class="m-2">
		<div class="flex justify-between items-center">
			<p class="ml-4">
				{#if timed}
					{formatDuration(set.duration ?? 0)} min
				{:else}
					{set.reps} reps @ {displayWeight(set.weight, $weightUnit)}
				{/if}
			</p>

			<div class="ml-auto">
				{#if display !== undefined}
					{#if display > 0}
						<Tick />
					{:else if display < 0}
						<Cross />
					{:else}
						<Dash />
					{/if}
				{/if}
			</div>

			{#if !brief}
				<Dialog.Root>
					<Dialog.Trigger class={`${buttonVariants({ variant: 'ghost' })}`}>Edit</Dialog.Trigger>
					<Dialog.Content class="w-3/4 max-w-lg">
						<Dialog.Header>
							<Dialog.Title>Edit Set</Dialog.Title>
						</Dialog.Header>
						<InlineSetEdit
							{timed}
							bind:duration={updatedDuration}
							bind:reps={updatedReps}
							bind:weight={updatedWeight}
							bind:notes={updatedNotes}
						/>
						<br />
						<Dialog.Footer class="flex flex-row gap-2">
							<ConfirmDelete {deletionCallback} {set} />
							<Dialog.Close
								class={buttonVariants({ variant: 'default' }) + ' ml-auto'}
								on:click={updateSet}>Save</Dialog.Close
							>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			{/if}
		</div>
		{#if set.notes}
			<p class="ml-4 mb-4"><b>Notes:</b> {set.notes}</p>
		{/if}
	</div>
</Card.Root>
