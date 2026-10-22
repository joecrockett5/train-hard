<script lang="ts">
	import TemplateInfo from '$lib/hard-components/template-info.svelte';
	import TemplateExercise from '$lib/hard-components/template-exercise.svelte';
	import ExerciseInfoComponent from '$lib/hard-components/exercise-info.svelte';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import NewExercise from '$lib/hard-components/new-exercise.svelte';
	import TagFilter from '$lib/hard-components/tag-filter.svelte';
	import Pager, { PAGE_SIZE } from '$lib/hard-components/pager.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { filterByTags } from '$lib/tags';
	import { type Exercise, type Tag, type Template } from '$lib/types';
	import { goto } from '$app/navigation';

	export let data;

	let template: Template;
	let exercises: Exercise[];
	let allExercises: Exercise[];
	let allTags: Tag[];

	let shownTemplateId: string | undefined;

	/**
	 * Takes the load's data when the template changes, and only then.
	 *
	 * The same guard the workout page needs, for the same two reasons: moving
	 * between templates reuses this component rather than rebuilding it, and
	 * an unguarded reactive assignment would put the server's copy back after
	 * every local edit -- so a removed exercise would reappear.
	 */
	$: if (data.template.objectId !== shownTemplateId) {
		shownTemplateId = data.template.objectId;
		template = data.template;
		exercises = data.exercises;
		allExercises = data.allExercises;
		allTags = data.tags;
	}

	let search = '';
	let selectedTagIds: string[] = [];
	let exercisePage = 1;
	let pickerOpen = false;

	// Every tag in use across the profile's exercises, so the picker only
	// offers tags that could actually narrow this list.
	$: filterableTags = [
		...new Map(
			allExercises
				.flatMap((exercise: Exercise) => exercise.tags ?? [])
				.map((tag) => [tag.objectId, tag])
		).values()
	];

	$: possibleExercises = filterByTags(allExercises, selectedTagIds)
		.filter(
			(exercise: Exercise) =>
				exercise.name.toLowerCase().includes(search.toLowerCase()) ||
				exercise.description.toLowerCase().includes(search.toLowerCase())
		)
		.filter(
			(exercise: Exercise) => !exercises.find((e: Exercise) => e.objectId === exercise.objectId)
		)
		.sort((a: Exercise, b: Exercise) => a.name.localeCompare(b.name));

	$: viewableExercises = possibleExercises.slice(
		(exercisePage - 1) * PAGE_SIZE,
		exercisePage * PAGE_SIZE
	);

	// Either control narrows the list, so both have to send it back to a page
	// that still exists.
	$: if (search || selectedTagIds) {
		exercisePage = 1;
	}

	async function addExercise(exercise: Exercise) {
		const response = await fetch('/api/template-joins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				templateId: template.objectId,
				exerciseId: exercise.objectId
			})
		});

		if (!response.ok) {
			console.error(`Unable to add '${exercise.name}' to the template`);
			return;
		}

		exercises = [...exercises, exercise];
		search = '';
		selectedTagIds = [];
	}

	/** A new exercise goes straight into this template, and into the picker's list. */
	async function createdExercise(exercise: Exercise) {
		allExercises = [...allExercises, exercise];
		await addExercise(exercise);
		pickerOpen = false;
	}

	async function removeExercise(exercise: Exercise) {
		const response = await fetch(
			`/api/template-joins?templateId=${template.objectId}&exerciseId=${exercise.objectId}`,
			{ method: 'DELETE' }
		);

		if (!response.ok) {
			console.error(`Unable to remove '${exercise.name}' from the template`);
			return;
		}

		exercises = exercises.filter((e: Exercise) => e.objectId !== exercise.objectId);
	}

	async function deleteTemplate(toDelete: Template) {
		const response = await fetch(`/api/templates/${toDelete.objectId}`, { method: 'DELETE' });

		if (!response.ok) {
			console.error('Failed to delete template: ', toDelete);
			return;
		}

		await goto('/templates');
	}
</script>

<svelte:head>
	<title>hard: {template.name}</title>
</svelte:head>

<TemplateInfo
	{template}
	bind:allTags
	deletionCallback={deleteTemplate}
	exerciseCount={exercises.length}
/>

<NewItem
	item="Exercise"
	description={`Add an exercise to “${template.name}”`}
	bind:open={pickerOpen}
>
	<div>
		<label for="Search" class="text-left"><b>Search</b></label>
		<Input placeholder="Name or description" bind:value={search} />
		<TagFilter tags={filterableTags} bind:selected={selectedTagIds} />
		<NewExercise bind:allTags onCreated={createdExercise} label="New Exercise" />
	</div>
	<Pager count={possibleExercises.length} bind:page={exercisePage} />

	{#each viewableExercises as possibleExercise}
		<Dialog.Close class="w-full text-left" on:click={() => addExercise(possibleExercise)}>
			<ExerciseInfoComponent exercise={possibleExercise} brief />
		</Dialog.Close>
	{/each}
</NewItem>

{#each exercises as exercise (exercise.objectId)}
	<TemplateExercise {exercise} removalCallback={removeExercise} />
{/each}

{#if exercises.length === 0}
	<p class="text-muted-foreground mt-8 text-center text-sm">
		No exercises yet. Add the ones this template should pull in.
	</p>
{/if}

<div class="mb-8" />
