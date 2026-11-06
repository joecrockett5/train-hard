<script lang="ts">
	import { goto } from '$app/navigation';
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import ExerciseRow from '$lib/components/ExerciseRow.svelte';
	import ExercisePicker from '$lib/components/ExercisePicker.svelte';
	import TemplateDialog from '$lib/components/TemplateDialog.svelte';
	import TagBadge from '$lib/components/TagBadge.svelte';
	import { sortTags } from '$lib/tags';
	import { t } from '$lib/i18n';
	import type { Exercise, Tag, Template } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** The same guard the workout screen needs, for the same two reasons. */
	let shownId = $state<string | undefined>();
	// svelte-ignore state_referenced_locally
	let template = $state<Template>(data.template);
	let exercises = $state<Exercise[]>([]);
	let allExercises = $state<Exercise[]>([]);
	let allTags = $state<Tag[]>([]);

	$effect(() => {
		if (data.template.objectId === shownId) {
			return;
		}

		shownId = data.template.objectId;
		template = data.template;
		exercises = data.exercises;
		allExercises = data.allExercises;
		allTags = data.tags;
	});

	let picking = $state(false);
	let editing = $state(false);
	let removing = $state<Exercise | null>(null);

	const tags = $derived(sortTags(template.tags ?? []));

	async function addExercise(exercise: Exercise) {
		try {
			const response = await fetch('/api/template-joins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ templateId: template.objectId, exerciseId: exercise.objectId })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			exercises = [...exercises, exercise];
		} catch (error) {
			console.error(`Could not add '${exercise.name}' to the template: `, error);
		}
	}

	async function createdExercise(exercise: Exercise) {
		allExercises = [...allExercises, exercise];
		await addExercise(exercise);
	}

	async function removeExercise(exercise: Exercise) {
		try {
			const response = await fetch(
				`/api/template-joins?templateId=${template.objectId}&exerciseId=${exercise.objectId}`,
				{ method: 'DELETE' }
			);

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			exercises = exercises.filter((each) => each.objectId !== exercise.objectId);
		} catch (error) {
			console.error(`Could not remove '${exercise.name}': `, error);
		}
	}

	async function deleteTemplate(toDelete: Template) {
		try {
			const response = await fetch(`/api/templates/${toDelete.objectId}`, { method: 'DELETE' });

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			await goto('/templates');
		} catch (error) {
			console.error('Could not delete the template: ', error);
		}
	}
</script>

<svelte:head>
	<title>{t.app.name} · {template.name}</title>
</svelte:head>

<header class="screen-head">
	<Button variant="ghost" size="sm" icon="arrowLeft" href="/templates" class="back">
		{t.templates.title}
	</Button>

	<div class="titles">
		<h1>{template.name}</h1>
		<p>{t.templates.exerciseCount(exercises.length)}</p>
	</div>

	{#if tags.length > 0}
		<div class="tags">
			{#each tags as tag (tag.objectId)}
				<TagBadge {tag} />
			{/each}
		</div>
	{/if}

	{#if template.description}
		<Card><p class="notes">{template.description}</p></Card>
	{/if}

	<Button variant="secondary" size="sm" icon="pencil" class="edit" onclick={() => (editing = true)}>
		{t.common.edit}
	</Button>
</header>

<Button variant="primary" icon="plus" full onclick={() => (picking = true)}>
	{t.workouts.addExercise}
</Button>

{#if exercises.length > 0}
	<ul>
		{#each exercises as exercise (exercise.objectId)}
			<li>
				<div class="entry">
					<ExerciseRow {exercise} />
					<Button
						variant="ghost"
						size="sm"
						iconOnly
						icon="close"
						label={t.common.remove}
						onclick={() => (removing = exercise)}
					/>
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<Card>
		<EmptyState icon="list" title={t.templates.empty}>
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
	description={t.templates.addExerciseTo(template.name)}
	{allExercises}
	present={exercises}
	onpick={addExercise}
	oncreate={createdExercise}
/>

<TemplateDialog
	bind:open={editing}
	{template}
	bind:allTags
	onsaved={(saved) => {
		template = saved;
	}}
	ondelete={deleteTemplate}
/>

{#if removing}
	<ConfirmDialog
		open={true}
		title={t.confirm.removeFromTemplate(removing.name)}
		body={t.confirm.removeFromTemplateBody}
		confirmLabel={t.common.remove}
		onconfirm={async () => {
			const exercise = removing;
			removing = null;
			if (exercise) {
				await removeExercise(exercise);
			}
		}}
	/>
{/if}

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

	.screen-head :global(.edit) {
		align-self: flex-start;
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

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.notes {
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.entry {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.entry :global(.card) {
		flex: 1;
		min-width: 0;
	}
</style>
