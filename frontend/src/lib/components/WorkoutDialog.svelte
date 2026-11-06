<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import ImportTemplateDialog from './ImportTemplateDialog.svelte';
	import type { Template, WorkoutInfo } from '$lib/types';
	import { longDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';

	/**
	 * Starting a workout, or editing one.
	 *
	 * The date is shown and not editable. It is set from wherever the workout
	 * was started -- the dashboard means today, the calendar means the day on
	 * screen -- which is what lets a session be logged days later and still
	 * land on the right day.
	 */
	type Props = {
		open?: boolean;
		/** Absent when creating. */
		workout?: WorkoutInfo;
		/** The day a new workout is for. */
		date: string;
		/** Offered while creating, so a workout can start from a list. */
		templates?: Template[];
		onsaved: (workout: WorkoutInfo, template: Template | null) => void | Promise<void>;
		ondelete?: (workout: WorkoutInfo) => void | Promise<void>;
	};

	let { open = $bindable(false), workout, date, templates, onsaved, ondelete }: Props = $props();

	const editing = $derived(workout !== undefined);
	const forDate = $derived(workout?.workoutDate ?? date);

	let title = $state('');
	let notes = $state('');
	let saving = $state(false);
	let failed = $state(false);
	let confirming = $state(false);
	/** Held until the workout exists, since its exercises need one to join to. */
	let chosen = $state<Template | null>(null);

	$effect(() => {
		if (!open) {
			return;
		}

		title = workout?.title ?? '';
		notes = workout?.notes ?? '';
		chosen = null;
		failed = false;
	});

	async function save() {
		const trimmed = title.trim();

		if (!trimmed || saving) {
			return;
		}
		saving = true;
		failed = false;

		try {
			const response = await fetch(
				editing ? `/api/workouts/${workout?.objectId}` : '/api/workouts',
				{
					method: editing ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...(editing ? { timestamp: workout?.timestamp, objectId: workout?.objectId } : {}),
						title: trimmed,
						notes: notes.trim(),
						workoutDate: forDate
					})
				}
			);

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			await onsaved(await response.json(), chosen);
			open = false;
		} catch (error) {
			console.error('Could not save the workout: ', error);
			// Left open, with what was typed still in it: closing first would
			// lose the title and give no sign anything went wrong.
			failed = true;
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	title={editing ? t.workouts.editWorkout : t.workouts.newWorkout}
	description={longDate(forDate)}
>
	<Field id="workout-title" label={t.common.title}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={title}
				placeholder={t.workouts.titlePlaceholder}
				enterkeyhint="next"
				onkeydown={(event) => event.key === 'Enter' && save()}
			/>
		{/snippet}
	</Field>

	<Field id="workout-notes" label={t.common.notes}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={notes}
				placeholder={t.workouts.notesPlaceholder}
				enterkeyhint="done"
				onkeydown={(event) => event.key === 'Enter' && save()}
			/>
		{/snippet}
	</Field>

	{#if !editing && templates}
		<ImportTemplateDialog
			{templates}
			description={t.templates.importHelpDeferred}
			onpick={(template) => {
				chosen = template;
			}}
		/>
		{#if chosen}
			<p class="chosen">
				{t.templates.importedFrom(chosen.name)}
				<button type="button" onclick={() => (chosen = null)}>{t.common.clear}</button>
			</p>
		{/if}
	{/if}

	{#if failed}
		<p class="error" role="alert">{t.errors.createWorkout}</p>
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
		<Button variant="primary" class="save" busy={saving} disabled={!title.trim()} onclick={save}>
			{editing ? t.common.save : t.dashboard.start}
		</Button>
	{/snippet}
</Dialog>

{#if workout && ondelete}
	<ConfirmDialog
		bind:open={confirming}
		title={t.confirm.deleteWorkout(workout.title)}
		body={t.confirm.deleteWorkoutBody}
		onconfirm={() => ondelete(workout)}
	/>
{/if}

<style>
	.chosen {
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}

	.chosen button {
		margin-left: var(--space-2);
		color: var(--brand);
		font-weight: 600;
		text-decoration: underline;
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}

	:global(dialog footer .save) {
		margin-left: auto;
	}
</style>
