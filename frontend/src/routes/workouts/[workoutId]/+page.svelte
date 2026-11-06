<script lang="ts">
	import { goto } from '$app/navigation';
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import ExerciseCard from '$lib/components/ExerciseCard.svelte';
	import ExercisePicker from '$lib/components/ExercisePicker.svelte';
	import WorkoutDialog from '$lib/components/WorkoutDialog.svelte';
	import SaveAsTemplateDialog from '$lib/components/SaveAsTemplateDialog.svelte';
	import { importTemplate } from '$lib/templates';
	import { longDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';
	import type { Exercise, Tag, Template, WorkoutInfo } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * The page's own copies.
	 *
	 * Taken from the load when the workout changes and only then. These are
	 * edited in place -- an exercise added, one removed -- and re-reading
	 * `data` on every update would put the server's copy back, so a removed
	 * exercise would reappear until the next reload. Keying the reset on the
	 * id also handles moving between two workouts, which reuses this
	 * component rather than rebuilding it.
	 */
	let shownId = $state<string | undefined>();
	// svelte-ignore state_referenced_locally
	let workout = $state<WorkoutInfo>(data.workoutInfo);
	let exercises = $state<Exercise[]>([]);
	let allExercises = $state<Exercise[]>([]);
	let allTags = $state<Tag[]>([]);
	let templates = $state<Template[]>([]);

	$effect(() => {
		if (data.workoutInfo.objectId === shownId) {
			return;
		}

		shownId = data.workoutInfo.objectId;
		workout = data.workoutInfo;
		exercises = data.exercises;
		allExercises = data.allExercises;
		allTags = data.tags;
		templates = data.templates;
	});

	let picking = $state(false);
	let editing = $state(false);
	let savingTemplate = $state(false);

	async function addExercise(exercise: Exercise) {
		try {
			const response = await fetch('/api/exercise-joins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ workoutId: workout.objectId, exerciseId: exercise.objectId })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			// The join id comes back here, which is what the sets hang off --
			// so logging one needs no further lookup.
			const join = await response.json();
			exercises = [...exercises, { ...exercise, joinId: join.objectId, sets: [] }];
		} catch (error) {
			console.error(`Could not add '${exercise.name}' to the workout: `, error);
		}
	}

	/** A new exercise goes straight into this workout, and into the picker's list. */
	async function createdExercise(exercise: Exercise) {
		allExercises = [...allExercises, exercise];
		await addExercise(exercise);
	}

	/**
	 * Pulls a template's exercises in, skipping the ones already here -- so
	 * importing part-way through a session tops the workout up rather than
	 * listing anything twice.
	 */
	async function addTemplate(template: Template) {
		try {
			const added = await importTemplate(
				template.objectId ?? '',
				workout.objectId ?? '',
				exercises.map((exercise) => exercise.objectId ?? '')
			);

			exercises = [...exercises, ...added];
		} catch (error) {
			console.error(`Could not import '${template.name}': `, error);
		}
	}

	async function removeExercise(exercise: Exercise) {
		try {
			const response = await fetch(
				`/api/exercise-joins?workoutId=${workout.objectId}&exerciseId=${exercise.objectId}`,
				{ method: 'DELETE' }
			);

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			exercises = exercises.filter((each) => each.objectId !== exercise.objectId);
		} catch (error) {
			console.error('Could not remove the exercise: ', error);
		}
	}

	async function deleteWorkout(toDelete: WorkoutInfo) {
		try {
			const response = await fetch(`/api/workouts/${toDelete.objectId}`, { method: 'DELETE' });

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			await goto(`/workouts?date=${toDelete.workoutDate}`);
		} catch (error) {
			console.error('Could not delete the workout: ', error);
		}
	}
</script>

<svelte:head>
	<title>{t.app.name} · {workout.title}</title>
</svelte:head>

<header class="screen-head">
	<Button
		variant="ghost"
		size="sm"
		icon="arrowLeft"
		href="/workouts?date={workout.workoutDate}"
		class="back"
	>
		{t.workouts.backToDay}
	</Button>

	<div class="titles">
		<h1>{workout.title}</h1>
		<p>{longDate(workout.workoutDate)} · {t.workouts.exerciseCount(exercises.length)}</p>
	</div>

	<div class="head-actions">
		<Button variant="secondary" size="sm" icon="pencil" onclick={() => (editing = true)}>
			{t.common.edit}
		</Button>
		<Button variant="secondary" size="sm" icon="bookmark" onclick={() => (savingTemplate = true)}>
			{t.templates.saveAs}
		</Button>
	</div>

	{#if workout.notes}
		<Card><p class="notes">{workout.notes}</p></Card>
	{/if}
</header>

<Button variant="primary" icon="plus" full onclick={() => (picking = true)}>
	{t.workouts.addExercise}
</Button>

{#if exercises.length > 0}
	<!--
		Keyed by the join, not the exercise: the same exercise can appear in
		two workouts, and the card holds that appearance's sets.
	-->
	<ul class="exercises">
		{#each exercises as exercise (exercise.joinId ?? exercise.objectId)}
			<li>
				<ExerciseCard {exercise} workoutId={workout.objectId ?? ''} onremove={removeExercise} />
			</li>
		{/each}
	</ul>
{:else}
	<Card>
		<EmptyState icon="list" title={t.workouts.noExercises}>
			{#snippet action()}
				<Button variant="outline" icon="plus" onclick={() => (picking = true)}>
					{t.workouts.addExercise}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{/if}

<ExercisePicker
	bind:open={picking}
	bind:allTags
	title={t.workouts.addExercise}
	description={t.workouts.addExerciseTo(workout.title)}
	{allExercises}
	present={exercises}
	{templates}
	onpick={addExercise}
	oncreate={createdExercise}
	onimport={addTemplate}
/>

<WorkoutDialog
	bind:open={editing}
	{workout}
	date={workout.workoutDate}
	onsaved={(saved) => {
		workout = saved;
	}}
	ondelete={deleteWorkout}
/>

<SaveAsTemplateDialog
	bind:open={savingTemplate}
	{exercises}
	bind:allTags
	defaultName={workout.title}
/>

<style>
	.screen-head {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.screen-head :global(.back) {
		align-self: flex-start;
		margin-left: calc(-1 * var(--space-3));
	}

	h1 {
		font-size: var(--text-xl);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.titles p {
		font-size: var(--text-sm);
		color: var(--ink-subtle);
	}

	.head-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.notes {
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}

	.exercises {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
</style>
