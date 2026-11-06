<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import SegmentedControl from '$ui/SegmentedControl.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import TagPicker from './TagPicker.svelte';
	import type { Exercise, Tag } from '$lib/types';
	import { t } from '$lib/i18n';

	/**
	 * Creating or editing an exercise, with its tags.
	 *
	 * One dialog for both, because they are the same form: the only
	 * differences are the title, whether the tag picker writes its joins
	 * immediately, and whether there is anything to delete.
	 *
	 * The kind is offered in both. It was creation-only, and because the
	 * update body sends `kind` with a default of `reps`, saving an edit to a
	 * timed exercise silently converted it back to reps.
	 */
	type Props = {
		open?: boolean;
		/** Absent when creating. */
		exercise?: Exercise;
		/** Every tag the profile has. Bound, so a tag made here is offered later. */
		allTags?: Tag[];
		onsaved: (exercise: Exercise) => void | Promise<void>;
		ondelete?: (exercise: Exercise) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		exercise,
		allTags = $bindable([]),
		onsaved,
		ondelete
	}: Props = $props();

	const editing = $derived(exercise !== undefined);

	let name = $state('');
	let description = $state('');
	let kind = $state<'reps' | 'time'>('reps');
	let tags = $state<Tag[]>([]);
	let saving = $state(false);
	let failed = $state(false);
	let confirming = $state(false);

	// Reset each time it opens, so a cancelled edit does not leak into the next.
	$effect(() => {
		if (!open) {
			return;
		}

		name = exercise?.name ?? '';
		description = exercise?.description ?? '';
		kind = exercise?.kind ?? 'reps';
		tags = [...(exercise?.tags ?? [])];
		failed = false;
	});

	async function save() {
		const trimmed = name.trim();

		if (!trimmed || saving) {
			return;
		}
		saving = true;
		failed = false;

		try {
			const response = await fetch(
				editing ? `/api/exercises/${exercise?.objectId}` : '/api/exercises',
				{
					method: editing ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...(editing ? { timestamp: exercise?.timestamp, objectId: exercise?.objectId } : {}),
						name: trimmed,
						description: description.trim(),
						kind
					})
				}
			);

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const saved: Exercise = await response.json();

			/*
			 * Creating: the tag picker only collected a choice, because joins
			 * need an id to point at. One that fails leaves the exercise made
			 * and that tag off -- fixable in this same dialog -- rather than
			 * losing the lot.
			 */
			if (!editing) {
				const applied: Tag[] = [];

				for (const tag of tags) {
					const join = await fetch('/api/tag-joins', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ targetId: saved.objectId, tagId: tag.objectId })
					});

					if (join.ok) {
						applied.push(tag);
					} else {
						console.error(`Could not tag '${saved.name}' with '${tag.name}'`);
					}
				}

				saved.tags = applied;
			} else {
				// Editing: the picker wrote them as they were toggled.
				saved.tags = tags;
			}

			await onsaved(saved);
			open = false;
		} catch (error) {
			console.error('Could not save the exercise: ', error);
			failed = true;
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	title={editing ? t.exercises.editExercise(exercise?.name ?? '') : t.exercises.newExercise}
>
	<Field id="exercise-name" label={t.common.name}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={name}
				placeholder={t.exercises.namePlaceholder}
				enterkeyhint="next"
				onkeydown={(event) => event.key === 'Enter' && save()}
			/>
		{/snippet}
	</Field>

	<Field id="exercise-description" label={t.common.description}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={description}
				placeholder={t.exercises.descriptionPlaceholder}
			/>
		{/snippet}
	</Field>

	<SegmentedControl
		name="exercise-kind"
		legend={t.exercises.measuredIn}
		hideLegend={false}
		bind:value={kind}
		options={[
			{ value: 'reps', label: t.exercises.kindReps, icon: 'dumbbell' },
			{ value: 'time', label: t.exercises.kindTime, icon: 'clock' }
		]}
	/>
	<p class="help">{t.exercises.measuredInHelp}</p>

	<TagPicker
		bind:allTags
		bind:selected={tags}
		targetId={editing ? (exercise?.objectId ?? '') : ''}
	/>

	{#if failed}
		<p class="error" role="alert">{t.errors.createExercise}</p>
	{/if}

	{#snippet footer()}
		{#if editing && ondelete}
			<Button
				variant="ghost"
				icon="trash"
				onclick={() => {
					open = false;
					confirming = true;
				}}
			>
				{t.common.delete}
			</Button>
		{:else}
			<Button variant="ghost" onclick={() => (open = false)}>{t.common.cancel}</Button>
		{/if}
		<Button variant="primary" class="save" busy={saving} disabled={!name.trim()} onclick={save}>
			{editing ? t.common.save : t.exercises.addExercise}
		</Button>
	{/snippet}
</Dialog>

{#if exercise && ondelete}
	<ConfirmDialog
		bind:open={confirming}
		title={t.confirm.deleteExercise(exercise.name)}
		body={t.confirm.deleteExerciseBody}
		onconfirm={() => ondelete(exercise)}
	/>
{/if}

<style>
	.help {
		margin-top: calc(-1 * var(--space-2));
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}

	:global(dialog footer .save) {
		margin-left: auto;
	}
</style>
