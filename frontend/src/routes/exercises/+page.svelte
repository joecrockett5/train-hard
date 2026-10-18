<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import ExerciseInfoComponent from '$lib/hard-components/exercise-info.svelte';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { type Exercise, type Tag } from '$lib/types';
	import * as Pagination from '$lib/components/ui/pagination';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import TagFilter from '$lib/hard-components/tag-filter.svelte';
	import { filterByTags } from '$lib/tags';

	export let data;

	let page = 1;

	let exercises: Exercise[] = data.exercises.sort((a: Exercise, b: Exercise) =>
		a.name.localeCompare(b.name)
	);
	let allTags: Tag[] = data.tags;
	let selectedTagIds: string[] = [];

	$: matching = filterByTags(exercises, selectedTagIds);

	// Page 1 is the only page certain to exist after the filter narrows the
	// list; staying on page 4 of 4 would otherwise show nothing.
	$: if (selectedTagIds) {
		page = 1;
	}

	$: viewableExercises = matching.slice((page - 1) * 10, page * 10);

	let newExerciseName = '';
	let newExerciseDescription = '';

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
			exercises = [...exercises, createdExercise];
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
	<Input placeholder="Description" bind:value={newExerciseDescription} />
	<br />
	<Dialog.Footer>
		<Dialog.Close class={buttonVariants({ variant: 'default' })} on:click={addExercise}
			>Add</Dialog.Close
		>
	</Dialog.Footer>
</NewItem>

<Pagination.Root
	class="mt-4"
	count={matching.length}
	perPage={10}
	let:pages
	let:currentPage
	bind:page
>
	<Pagination.Content>
		<Pagination.Item>
			<Pagination.PrevButton>
				<ChevronLeft class="h-4 w-4" />
			</Pagination.PrevButton>
		</Pagination.Item>
		{#each pages as page (page.key)}
			{#if page.type === 'ellipsis'}
				<Pagination.Item>
					<Pagination.Ellipsis />
				</Pagination.Item>
			{:else}
				<Pagination.Item>
					<Pagination.Link {page} isActive={currentPage == page.value}>
						{page.value}
					</Pagination.Link>
				</Pagination.Item>
			{/if}
		{/each}
		<Pagination.Item>
			<Pagination.NextButton>
				<ChevronRight class="h-4 w-4" />
			</Pagination.NextButton>
		</Pagination.Item>
	</Pagination.Content>
</Pagination.Root>

{#each viewableExercises as exercise (exercise.objectId)}
	<ExerciseInfoComponent {exercise} bind:allTags deletionCallback={deleteExercise} />
{/each}

{#if matching.length === 0}
	<p class="text-muted-foreground mt-8 text-center text-sm">No exercises match those tags.</p>
{/if}

<div class="mb-8" />

<Pagination.Root
	class="mt-4"
	count={matching.length}
	perPage={10}
	let:pages
	let:currentPage
	bind:page
>
	<Pagination.Content>
		<Pagination.Item>
			<Pagination.PrevButton>
				<ChevronLeft class="h-4 w-4" />
			</Pagination.PrevButton>
		</Pagination.Item>
		{#each pages as page (page.key)}
			{#if page.type === 'ellipsis'}
				<Pagination.Item>
					<Pagination.Ellipsis />
				</Pagination.Item>
			{:else}
				<Pagination.Item>
					<Pagination.Link {page} isActive={currentPage == page.value}>
						{page.value}
					</Pagination.Link>
				</Pagination.Item>
			{/if}
		{/each}
		<Pagination.Item>
			<Pagination.NextButton>
				<ChevronRight class="h-4 w-4" />
			</Pagination.NextButton>
		</Pagination.Item>
	</Pagination.Content>
</Pagination.Root>
