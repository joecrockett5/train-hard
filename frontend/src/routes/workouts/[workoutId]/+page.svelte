<script lang="ts">
	import ExerciseComponent from '$lib/hard-components/exercise.svelte';
	import ExerciseInfoComponent from '$lib/hard-components/exercise-info.svelte';
	import WorkoutInfoComponent from '$lib/hard-components/workout-info.svelte';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import { type Exercise, type Tag, type Template, type WorkoutInfo } from '$lib/types';
	import TagFilter from '$lib/hard-components/tag-filter.svelte';
	import { filterByTags } from '$lib/tags';
	import Pager, { PAGE_SIZE } from '$lib/hard-components/pager.svelte';
	import NewExercise from '$lib/hard-components/new-exercise.svelte';
	import ImportTemplate from '$lib/hard-components/import-template.svelte';
	import { importTemplate } from '$lib/templates';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { goto } from '$app/navigation';

	export let data;

	let exercises: Exercise[];
	let workoutInfo: WorkoutInfo;
	let allExercises: Exercise[];
	let allTags: Tag[];
	let templates: Template[];

	let shownWorkoutId: string | undefined;

	/**
	 * Takes the load's data when the workout changes, and only then.
	 *
	 * Moving between two workouts is a navigation within the same route, so
	 * this component is reused rather than rebuilt: destructuring once in a
	 * plain `let` captured the first workout and never let go, which is why
	 * the quick switcher needed a manual reload.
	 *
	 * Assigning straight from `data` on every update is the other mistake.
	 * These four are edited in place -- an exercise removed, one added, a tag
	 * created -- and an unguarded reactive assignment re-runs after each of
	 * those and puts the server's copy back, so a deleted exercise reappeared
	 * until the page was reloaded. Keying the reset on the workout's id means
	 * a local edit is never undone, whatever else triggers an update.
	 */
	$: if (data.workoutInfo.objectId !== shownWorkoutId) {
		shownWorkoutId = data.workoutInfo.objectId;
		workoutInfo = data.workoutInfo;
		exercises = data.exercises;
		allExercises = data.allExercises;
		allTags = data.tags;
		templates = data.templates;
	}

	let possibleExercises: Exercise[] = [];

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

	let pickerOpen = false;

	/**
	 * A new exercise goes straight into this workout.
	 *
	 * Also into the picker's own source list, so that removing it from the
	 * workout later offers it again without a reload. The picker then closes:
	 * picking an existing exercise closes it, and having just made one you
	 * want to be back at the workout logging sets.
	 */
	async function createdExercise(exercise: Exercise) {
		allExercises = [...allExercises, exercise];
		await addExercise(exercise);
		pickerOpen = false;
	}

	// Either control narrows the list, so both have to send it back to a page
	// that still exists.
	$: if (search || selectedTagIds) {
		exercisePage = 1;
	}

	/**
	 * Pulls a template's exercises into this workout.
	 *
	 * Skips the ones already here, so importing part-way through a session
	 * tops the workout up rather than listing anything twice.
	 */
	async function addTemplate(template: Template) {
		try {
			const added = await importTemplate(
				template.objectId ?? '',
				workoutInfo.objectId ?? '',
				exercises.map((exercise: Exercise) => exercise.objectId ?? '')
			);

			exercises = [...exercises, ...added];
		} catch (error) {
			console.error(`Could not import '${template.name}': `, error);
		}

		pickerOpen = false;
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

	// Reactive, not computed once: `workoutInfo` is now assigned by the
	// reactive block above, which runs after the instance body, so reading it
	// here at init saw undefined -- and it has to follow the workout anyway
	// when the quick switcher moves between two.
	$: formattedDate = new Date(workoutInfo.workoutDate).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
</script>

<svelte:head>
	<title>hard: {workoutInfo.title} - {formattedDate}</title>
</svelte:head>

<WorkoutInfoComponent
	workout={workoutInfo}
	deletionCallback={deleteWorkout}
	{exercises}
	bind:allTags
/>

<NewItem
	item="Exercise"
	description={`Add an exercise to “${workoutInfo.title}”`}
	bind:open={pickerOpen}
>
	<div>
		<label for="Search" class="text-left"><b>Search</b></label>
		<Input placeholder="Name or description" bind:value={search} />
		<TagFilter tags={filterableTags} bind:selected={selectedTagIds} />
		<!--
			Always offered, rather than only when the search finds nothing: an
			exercise can be missing while its name still half-matches
			something else, and then the offer never appeared.
		-->
		<NewExercise bind:allTags onCreated={createdExercise} label="New Exercise" />
		<ImportTemplate {templates} onPick={addTemplate} />
	</div>
	<Pager count={possibleExercises.length} bind:page={exercisePage} />

	{#each viewableExercises as possibleExercise}
		<Dialog.Close class="w-full text-left" on:click={() => addExercise(possibleExercise)}>
			<ExerciseInfoComponent exercise={possibleExercise} brief />
		</Dialog.Close>
	{/each}
</NewItem>

<!--
	Keyed by the join, not the exercise: `ExerciseComponent` splits its sets
	into warm-up and working once, when it is created, so a reused instance
	would keep the previous workout's sets. The same exercise can appear in
	two workouts, so its own id is not enough to tell those apart.
-->
{#each exercises as exercise (exercise.joinId ?? exercise.objectId)}
	<ExerciseComponent
		{exercise}
		workoutId={workoutInfo.objectId ?? ''}
		deletionCallback={removeExercise}
	/>
{/each}
