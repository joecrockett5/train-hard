<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import ExerciseInfoComponent from '$lib/hard-components/exercise-info.svelte';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { type Exercise, type Tag } from '$lib/types';
	import Pager, { PAGE_SIZE } from '$lib/hard-components/pager.svelte';
	import TagFilter from '$lib/hard-components/tag-filter.svelte';
	import TagPicker from '$lib/hard-components/tag-picker.svelte';
	import { filterByTags } from '$lib/tags';

	export let data;

	let page = 1;

	// Newest first: the exercise you just made is the one you are looking for.
	let exercises: Exercise[] = data.exercises.sort(
		(a: Exercise, b: Exercise) =>
			new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
	);
	let allTags: Tag[] = data.tags;
	let selectedTagIds: string[] = [];

	$: matching = filterByTags(exercises, selectedTagIds);

	// Page 1 is the only page certain to exist after the filter narrows the
	// list; staying on page 4 of 4 would otherwise show nothing.
	$: if (selectedTagIds) {
		page = 1;
	}

	$: viewableExercises = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	let newExerciseName = '';
	let newExerciseDescription = '';
	let newExerciseTags: Tag[] = [];

	async function addExercise() {
		if (newExerciseName) {
			console.log(`adding exercise: ${newExerciseName}`);
			const response = await fetch(`/api/exercises`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: newExerciseName,
					description: newExerciseDescription
				})
			});
			if (!response.ok) {
				console.log(`Unable to create exercise '${newExerciseName}'`);
			}
			newExerciseName = '';
			newExerciseDescription = '';

			const createdExercise: Exercise = await response.json();

			// The joins can only be written once the exercise has an id, so
			// the picker above only collected the choice.
			const applied: Tag[] = [];
			for (const tag of newExerciseTags) {
				const join = await fetch('/api/tag-joins', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ targetId: createdExercise.objectId, tagId: tag.objectId })
				});

				if (join.ok) {
					applied.push(tag);
				} else {
					console.error(`Failed to tag '${createdExercise.name}' with '${tag.name}'`);
				}
			}

			createdExercise.tags = applied;
			newExerciseTags = [];
			exercises = [createdExercise, ...exercises];
		}
	}

	async function deleteExercise(exercise: Exercise) {
		const response = await fetch(`/api/exercises/${exercise.objectId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			console.error('Failed to delete exercise: ', exercise);
		} else {
			exercises = exercises.filter((e: Exercise) => e.objectId !== exercise.objectId);
		}
	}
</script>

<svelte:head>
	<title>hard: Exercises</title>
</svelte:head>

<Card.Root class="mt-4">
	<Card.Header>
		<Card.Title>Exercises</Card.Title>
		<Card.Description>
			{#if selectedTagIds.length > 0}
				{matching.length} of {exercises.length} exercises
			{:else}
				All exercises
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content class="pt-0">
		<TagFilter tags={allTags} bind:selected={selectedTagIds} />
	</Card.Content>
</Card.Root>

<NewItem item="Exercise">
	<label for="name">Name</label>
	<Input placeholder="Name" bind:value={newExerciseName} />
	<label for="description">Description</label>
	<Input placeholder="Description" bind:value={newExerciseDescription} class="mb-4" />
	<TagPicker bind:allTags bind:selected={newExerciseTags} />
	<br />
	<Dialog.Footer>
		<Dialog.Close class={buttonVariants({ variant: 'default' })} on:click={addExercise}
			>Add</Dialog.Close
		>
	</Dialog.Footer>
</NewItem>

<Pager count={matching.length} bind:page />

{#each viewableExercises as exercise (exercise.objectId)}
	<ExerciseInfoComponent {exercise} bind:allTags deletionCallback={deleteExercise} />
{/each}

{#if matching.length === 0}
	<p class="text-muted-foreground mt-8 text-center text-sm">No exercises match those tags.</p>
{/if}

<div class="mb-8" />

<Pager count={matching.length} bind:page />
