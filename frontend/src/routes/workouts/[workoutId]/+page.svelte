<script lang="ts">
	import ExerciseComponent from '$lib/hard-components/exercise.svelte';
	import ExerciseInfoComponent from '$lib/hard-components/exercise-info.svelte';
	import WorkoutInfoComponent from '$lib/hard-components/workout-info.svelte';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import { type Exercise, type WorkoutInfo } from '$lib/types';
	import TagFilter from '$lib/hard-components/tag-filter.svelte';
	import { filterByTags } from '$lib/tags';
	import Pager, { PAGE_SIZE } from '$lib/hard-components/pager.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { goto } from '$app/navigation';

	export let data;

	let { exercises, workoutInfo, allExercises } = data;
	let possibleExercises = [...allExercises];

	let search = '';
	let selectedTagIds: string[] = [];

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

	let exercisePage = 1;

	$: viewableExercises = possibleExercises.slice(
		(exercisePage - 1) * PAGE_SIZE,
		exercisePage * PAGE_SIZE
	);

	// Offered when the search finds nothing: mid-workout, the reason an
	// exercise is missing is usually that it has never been done before, and
	// leaving for the exercises page to make it loses your place.
	$: canCreate = search.trim().length > 0 && possibleExercises.length === 0;
	let creating = false;

	async function createAndAdd() {
		const name = search.trim();

		if (!name || creating) {
			return;
		}
		creating = true;

		try {
			const response = await fetch('/api/exercises', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description: '' })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const created: Exercise = await response.json();
			// Into the picker's own source list too, so removing it from the
			// workout later offers it again without a reload.
			allExercises = [...allExercises, created];
			await addExercise(created);
		} catch (error) {
			console.error(`Failed to create exercise '${name}': `, error);
		} finally {
			creating = false;
		}
	}

	// Either control narrows the list, so both have to send it back to a page
	// that still exists.
	$: if (search || selectedTagIds) {
		exercisePage = 1;
	}

	const addExercise = async (exercise: Exercise) => {
		console.log(`adding exercise: ${exercise.name}`);
		const response = await fetch(`/api/exercise-joins`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				workoutId: workoutInfo.objectId,
				exerciseId: exercise.objectId
			})
		});
		if (!response.ok) {
			console.log(`Unable to create exercise-join for '${exercise.name}'`);
		} else {
			exercises.push(exercise);
			exercises = exercises;
			search = '';
			selectedTagIds = [];
		}
	};

	const removeExercise = async (exercise: Exercise) => {
		const response = await fetch(
			`/api/exercise-joins?workoutId=${workoutInfo.objectId}&exerciseId=${exercise.objectId}`,
			{
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		if (!response.ok) {
			console.error('Failed to delete exercise: ', exercise);
		} else {
			exercises = exercises.filter((e: Exercise) => e.objectId !== exercise.objectId);
			exercises = exercises;
		}
	};

	async function deleteWorkout(workout: WorkoutInfo) {
		const response = await fetch(`/api/workouts/${workout.objectId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			console.error('Failed to delete workout: ', workout);
		} else {
			goto(`/workouts?date=${workout.workoutDate}`);
		}
	}

	const asDate = new Date(workoutInfo.workoutDate);
	const formattedDate = asDate.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
</script>

<svelte:head>
	<title>hard: {workoutInfo.title} - {formattedDate}</title>
</svelte:head>

<WorkoutInfoComponent workout={workoutInfo} deletionCallback={deleteWorkout} />

<NewItem
	item="Exercise"
	description={`Add an exercise to “${workoutInfo.title}”`}
	className="h-4/5"
>
	<div>
		<label for="Search" class="text-left"><b>Search</b></label>
		<Input placeholder="Name or description" bind:value={search} />
		<TagFilter tags={filterableTags} bind:selected={selectedTagIds} />
	</div>
	<Pager count={possibleExercises.length} bind:page={exercisePage} />

	{#each viewableExercises as possibleExercise}
		<Dialog.Close class="w-full text-left" on:click={() => addExercise(possibleExercise)}>
			<ExerciseInfoComponent exercise={possibleExercise} brief />
		</Dialog.Close>
	{/each}

	{#if canCreate}
		<Dialog.Close class="w-full" on:click={createAndAdd}>
			<Button variant="outline" class="mt-4 w-full justify-start text-left" disabled={creating}>
				<Plus class="mr-2 h-4 w-4 shrink-0" />
				Create “{search.trim()}” and add it
			</Button>
		</Dialog.Close>
	{/if}
</NewItem>

{#each exercises as exercise}
	<ExerciseComponent
		{exercise}
		workoutId={workoutInfo.objectId ?? ''}
		deletionCallback={removeExercise}
	/>
{/each}
