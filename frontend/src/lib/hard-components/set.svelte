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
		editableWeight,
		formatDuration,
		toStoredWeight,
		weightUnit,
		type WeightUnit
	} from '$lib/units';

	export let set: Set;
	export let deletionCallback: (set: Set) => void;
	/**
	 * Told that this set has changed, so the card around it can recompute.
	 *
	 * Editing a set mutates the object below, which is enough for this card
	 * but not for the one holding it: Svelte does not carry a child's mutation
	 * of a prop back up, so the exercise's comparison against the last session
	 * and the weight its next set starts from went on showing the old numbers
	 * until another set was added. Optional, because a set shown `brief` --
	 * inside the history popover -- cannot be edited at all.
	 */
	export let updateCallback: (set: Set) => void = () => {};
	export let brief = false;
	export let display: number | undefined = undefined;
	/** A timed exercise's sets show minutes rather than reps at a weight. */
	export let timed = false;

	// Edited in the unit on screen; stored in kilograms. Filled by
	// `refillEdits` below, which also runs before the first render.
	let updatedWeight: number;
	let updatedReps: number;
	let updatedDuration: number;
	let updatedNotes: string;

	/*
		Refilled whenever the set or the unit changes, rather than read once:
		this component outlives the set it is showing. An unkeyed `{#each}`
		reuses it by position, so deleting a set leaves it holding the next
		one along, and switching unit would leave a weight in the old unit
		sitting in a box labelled with the new one.

		The assignments sit in a function for the reason `exercise.svelte`
		gives: a variable assigned by a reactive statement and written by a
		`bind:` is re-derived on every keystroke, so the fields could not be
		typed into at all.
	*/
	$: refillEdits(set, $weightUnit);

	function refillEdits(current: Set, unit: WeightUnit) {
		updatedWeight = editableWeight(current.weight, unit);
		updatedReps = current.reps;
		updatedDuration = current.duration ?? 0;
		updatedNotes = current.notes;
	}

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
				reps: Number(updatedReps),
				duration: Number(updatedDuration),
				notes: updatedNotes,
				exerciseJoinId: set.exerciseJoinId
			})
		});

		if (!response.ok) {
			console.error('Failed to update set: ', set);
		} else {
			set.weight = toStoredWeight(Number(updatedWeight), $weightUnit);
			set.reps = Number(updatedReps);
			set.duration = Number(updatedDuration);
			set.notes = updatedNotes;
			updateCallback(set);
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
					<Dialog.Content>
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
