<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import Pager from '$ui/Pager.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import { PAGE_SIZE, pageOf } from '$ui/paging';
	import TagFilter from './TagFilter.svelte';
	import ExerciseRow from './ExerciseRow.svelte';
	import ExerciseDialog from './ExerciseDialog.svelte';
	import ImportTemplateDialog from './ImportTemplateDialog.svelte';
	import type { Exercise, Tag, Template } from '$lib/types';
	import { filterByTags } from '$lib/tags';
	import { t } from '$lib/i18n';

	/**
	 * Adding an exercise to a workout or a template.
	 *
	 * Search covers the name and the description, filtering is any-of-these
	 * tags, and anything already in the list is left out -- adding the same
	 * exercise twice is the one thing this dialog must not make easy.
	 */
	type Props = {
		open?: boolean;
		title: string;
		description: string;
		/** Every exercise the profile has. */
		allExercises: Exercise[];
		/** The ones already here, which are not offered. */
		present: Exercise[];
		allTags?: Tag[];
		/** Offered only where importing makes sense, which is a workout. */
		templates?: Template[];
		onpick: (exercise: Exercise) => void | Promise<void>;
		oncreate: (exercise: Exercise) => void | Promise<void>;
		onimport?: (template: Template) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		title,
		description,
		allExercises,
		present,
		allTags = $bindable([]),
		templates,
		onpick,
		oncreate,
		onimport
	}: Props = $props();

	let search = $state('');
	let selectedTagIds = $state<string[]>([]);
	let page = $state(1);
	let creating = $state(false);

	const presentIds = $derived(new Set(present.map((exercise) => exercise.objectId)));

	/**
	 * Only tags that appear on something offered here, so the filter cannot
	 * narrow the list to nothing by offering a tag nothing in it carries.
	 */
	const filterableTags = $derived([
		...new Map(
			allExercises.flatMap((exercise) => exercise.tags ?? []).map((tag) => [tag.objectId, tag])
		).values()
	]);

	const matching = $derived(
		filterByTags(allExercises, selectedTagIds)
			.filter((exercise) => !presentIds.has(exercise.objectId))
			.filter((exercise) => {
				const needle = search.trim().toLowerCase();

				return (
					!needle ||
					exercise.name.toLowerCase().includes(needle) ||
					exercise.description.toLowerCase().includes(needle)
				);
			})
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	const visible = $derived(pageOf(matching, page));

	async function pick(exercise: Exercise) {
		open = false;
		await onpick(exercise);
		// Widened again for next time: the filter that found this one is not
		// the filter that finds the next.
		search = '';
		selectedTagIds = [];
		page = 1;
	}
</script>

<Dialog bind:open {title} {description}>
	<Field id="exercise-search" label={t.common.search} hideLabel>
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
		The page resets from the event rather than from an effect watching the
		filter: an effect that assigns `page` re-runs on the pager's own
		writes, and every click on page 2 goes straight back to page 1.
	-->
	<TagFilter tags={filterableTags} bind:selected={selectedTagIds} onchange={() => (page = 1)} />

	<div class="actions">
		<Button variant="outline" icon="plus" onclick={() => (creating = true)}>
			{t.exercises.newExercise}
		</Button>
		{#if templates && onimport}
			<ImportTemplateDialog {templates} onpick={onimport} />
		{/if}
	</div>

	{#if matching.length > 0}
		<ul class="list">
			{#each visible as exercise (exercise.objectId)}
				<li><ExerciseRow {exercise} onpick={pick} /></li>
			{/each}
		</ul>
		<Pager count={matching.length} bind:page perPage={PAGE_SIZE} />
	{:else}
		<EmptyState
			icon="search"
			title={allExercises.length > 0 && presentIds.size === allExercises.length
				? t.workouts.allAlreadyAdded
				: t.workouts.noExercisesMatch}
		/>
	{/if}
</Dialog>

<ExerciseDialog bind:open={creating} bind:allTags onsaved={oncreate} />

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.actions :global(button) {
		flex: 1;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
</style>
