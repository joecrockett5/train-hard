<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import ExerciseInfoComponent from '$lib/hard-components/exercise-info.svelte';
	import NewExercise from '$lib/hard-components/new-exercise.svelte';
	import { type Exercise, type Tag } from '$lib/types';
	import Pager, { PAGE_SIZE } from '$lib/hard-components/pager.svelte';
	import TagFilter from '$lib/hard-components/tag-filter.svelte';
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

	$: viewableExercises = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
		<!--
			The page is reset here, on the event, rather than in a `$:` block
			watching the filter. Svelte invalidates a reactive statement's
			dependencies whenever anything else writes a variable that
			statement assigns, so a block doing `page = 1` re-ran on every
			write the pager's `bind:page` made, and sent each click on page 2
			straight back to page 1.
		-->
		<TagFilter tags={allTags} bind:selected={selectedTagIds} on:change={() => (page = 1)} />
	</Card.Content>
</Card.Root>

<NewExercise
	bind:allTags
	onCreated={(exercise) => {
		exercises = [exercise, ...exercises];
	}}
/>

<Pager count={matching.length} bind:page />

{#each viewableExercises as exercise (exercise.objectId)}
	<ExerciseInfoComponent {exercise} bind:allTags deletionCallback={deleteExercise} />
{/each}

{#if matching.length === 0}
	<!--
		Not "match those tags": this shows when the list is empty for any
		reason, including a profile with no exercises at all and no filter
		set, where blaming the tags described something the reader had not
		done.
	-->
	<p class="text-muted-foreground mt-8 text-center text-sm">No exercises match.</p>
{/if}

<div class="mb-8" />

<Pager count={matching.length} bind:page />
