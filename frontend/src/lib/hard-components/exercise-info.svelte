<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { buttonVariants } from '$lib/components/ui/button';
	import type { Exercise, Tag } from '$lib/types';
	import * as Dialog from '$lib/components/ui/dialog';
	import ConfirmDelete from './confirm-delete-exercise-info.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import TagBadge from './tag-badge.svelte';
	import TagPicker from './tag-picker.svelte';
	import { sortTags } from '$lib/tags';
	import type { SetSummaryEntry } from '$lib/sets';

	export let exercise: Exercise;
	/**
	 * Every tag the profile has, for the picker. Bound so that a tag created
	 * from inside one exercise's dialog is offered by the next one, without
	 * reloading the page.
	 */
	export let allTags: Tag[] = [];
	// Only reachable through the edit dialog, which `brief` hides, so
	// callers rendering a brief card legitimately omit it.
	export let deletionCallback: (exercise: Exercise) => void = () => {};
	export let brief: boolean = false;
	/**
	 * This exercise's sets, for the minimised card on a workout page. Passed
	 * in rather than read off `exercise.sets`, because the workout page keeps
	 * its own live copy that changes as sets are logged.
	 */
	export let setSummary: SetSummaryEntry[] = [];

	let updatedName = exercise.name;
	let updatedDescription = exercise.description;

	// `bind:` needs something to bind to, and an exercise from an endpoint
	// that does not join tags in arrives without the field at all.
	exercise.tags = exercise.tags ?? [];

	// The picker writes tag joins as they are toggled rather than on save, so
	// this is bound straight to the exercise instead of being staged like the
	// name and description.
	$: tags = sortTags(exercise.tags ?? []);

	async function updateExercise() {
		const response = await fetch(`/api/exercises/${exercise.objectId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				timestamp: exercise.timestamp,
				objectId: exercise.objectId,
				name: updatedName,
				description: updatedDescription
			})
		});

		if (!response.ok) {
			console.error('Failed to update exercise: ', exercise);
		} else {
			exercise.name = updatedName;
			exercise.description = updatedDescription;
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
					<Dialog.Title>Edit {exercise.name}</Dialog.Title>
					<Dialog.Description>Edit this exercise</Dialog.Description>
				</Dialog.Header>
				<label for="name">Name</label>
				<Input placeholder="Name" bind:value={updatedName} class="mb-2" />
				<label for="description">Description</label>
				<Input placeholder="Description" bind:value={updatedDescription} class="mb-4" />
				<TagPicker bind:allTags bind:selected={exercise.tags} targetId={exercise.objectId ?? ''} />
				<br />
				<Dialog.Footer class="flex flex-row gap-2">
					<ConfirmDelete {deletionCallback} {exercise} />
					<Dialog.Close
						class={buttonVariants({ variant: 'default' }) + ' ml-auto'}
						on:click={updateExercise}>Save</Dialog.Close
					>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
	<Card.Header>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<Card.Title>{exercise.name}</Card.Title>
				<Card.Description>{exercise.description}</Card.Description>
			</div>
			{#if setSummary.length > 0}
				<!--
					Wraps rather than truncating: on a long exercise the later
					sets are the ones worth seeing, so hiding them behind an
					ellipsis would hide the useful half.
				-->
				<p class="text-muted-foreground max-w-[55%] text-right text-sm leading-snug">
					{#each setSummary as entry, index}<span class:italic={entry.warmup}>{entry.label}</span
						>{#if index < setSummary.length - 1}{', '}{/if}{/each}
				</p>
			{/if}
		</div>
	</Card.Header>
	{#if tags.length > 0}
		<Card.Content>
			<div class="flex flex-wrap gap-2">
				{#each tags as tag (tag.objectId)}
					<TagBadge {tag} />
				{/each}
			</div>
		</Card.Content>
	{/if}
</Card.Root>
