<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import Pager from '$ui/Pager.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import { pageOf } from '$ui/paging';
	import ExerciseRow from '$lib/components/ExerciseRow.svelte';
	import ExerciseDialog from '$lib/components/ExerciseDialog.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';
	import { filterByTags } from '$lib/tags';
	import { t } from '$lib/i18n';
	import type { Exercise, Tag } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Newest first: the exercise you just made is the one you are looking for.
	let exercises = $state<Exercise[]>([]);
	let allTags = $state<Tag[]>([]);

	$effect(() => {
		exercises = data.exercises
			.slice()
			.sort((a: Exercise, b: Exercise) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
	});

	$effect(() => {
		allTags = data.tags;
	});

	let search = $state('');
	let selectedTagIds = $state<string[]>([]);
	let page = $state(1);
	let editing = $state<Exercise | undefined>(undefined);
	let dialogOpen = $state(false);

	const matching = $derived(
		filterByTags(exercises, selectedTagIds).filter((exercise) => {
			const needle = search.trim().toLowerCase();

			return (
				!needle ||
				exercise.name.toLowerCase().includes(needle) ||
				exercise.description.toLowerCase().includes(needle)
			);
		})
	);

	const visible = $derived(pageOf(matching, page));
	const narrowed = $derived(selectedTagIds.length > 0 || search.trim().length > 0);

	function open(exercise?: Exercise) {
		editing = exercise;
		dialogOpen = true;
	}

	function saved(exercise: Exercise) {
		exercises = editing
			? exercises.map((each) => (each.objectId === exercise.objectId ? exercise : each))
			: [exercise, ...exercises];
	}

	async function remove(exercise: Exercise) {
		try {
			const response = await fetch(`/api/exercises/${exercise.objectId}`, { method: 'DELETE' });

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			exercises = exercises.filter((each) => each.objectId !== exercise.objectId);
		} catch (error) {
			console.error('Could not delete the exercise: ', error);
		}
	}
</script>

<svelte:head>
	<title>{t.app.name} · {t.exercises.title}</title>
</svelte:head>

<header class="screen-head">
	<div>
		<h1>{t.exercises.title}</h1>
		<p>
			{narrowed ? t.exercises.matching(matching.length, exercises.length) : t.exercises.all}
		</p>
	</div>
	<Button variant="primary" icon="plus" onclick={() => open()}>{t.exercises.newExercise}</Button>
</header>

<Card>
	<div class="filters">
		<Field id="exercises-search" label={t.common.search} hideLabel>
			{#snippet children({ id, describedBy })}
				<TextInput
					{id}
					{describedBy}
					type="search"
					inputmode="search"
					bind:value={search}
					placeholder={t.workouts.searchPlaceholder}
					oninput={() => (page = 1)}
				/>
			{/snippet}
		</Field>
		<!--
			The page resets from the event rather than from an effect watching
			the filter: an effect that assigns `page` re-runs on the pager's
			own writes, and every click on page 2 goes straight back to 1.
		-->
		<TagFilter tags={allTags} bind:selected={selectedTagIds} onchange={() => (page = 1)} />
	</div>
</Card>

{#if matching.length > 0}
	<ul>
		{#each visible as exercise (exercise.objectId)}
			<li><ExerciseRow {exercise} onedit={open} /></li>
		{/each}
	</ul>
	<Pager count={matching.length} bind:page />
{:else}
	<Card>
		<!--
			Not "no exercises match those tags": this shows when the list is
			empty for any reason, including a profile with no exercises at all,
			where blaming the filter describes something nobody did.
		-->
		<EmptyState icon="list" title={narrowed ? t.exercises.none : t.exercises.noneAtAll}>
			{#snippet action()}
				<Button variant="outline" icon="plus" onclick={() => open()}>
					{t.exercises.newExercise}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{/if}

<ExerciseDialog
	bind:open={dialogOpen}
	exercise={editing}
	bind:allTags
	onsaved={saved}
	ondelete={remove}
/>

<style>
	.screen-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	h1 {
		font-size: var(--text-xl);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.screen-head p {
		font-size: var(--text-sm);
		color: var(--ink-subtle);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
</style>
