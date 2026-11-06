<script lang="ts">
	import Icon from '$ui/Icon.svelte';
	import Button from '$ui/Button.svelte';
	import Dialog from '$ui/Dialog.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import SetEditor from './SetEditor.svelte';
	import type { Set } from '$lib/types';
	import type { SetComparison } from '$lib/sets';
	import {
		displayWeight,
		formatDuration,
		formatWeight,
		toDisplayWeight,
		toStoredWeight
	} from '$lib/units';
	import { preferences } from '$lib/preferences.svelte';
	import { t } from '$lib/i18n';

	/**
	 * One logged set.
	 *
	 * The comparison mark is a glyph as well as a colour -- up, down or equal
	 * -- with its meaning in the accessible name, so "better than last time"
	 * is never carried by green alone.
	 */
	type Props = {
		set: Set;
		timed?: boolean;
		/** Against the same position last session. Undefined when there is none. */
		comparison?: SetComparison;
		/** Read-only, for a set shown inside the history sheet. */
		readonly?: boolean;
		onchange?: (set: Set) => void;
		ondelete?: (set: Set) => void | Promise<void>;
	};

	let { set, timed = false, comparison, readonly = false, onchange, ondelete }: Props = $props();

	const prefs = preferences();

	let editing = $state(false);
	let confirming = $state(false);
	let saving = $state(false);
	let failed = $state(false);

	// Edited in the unit on screen; stored in kilograms.
	let reps = $state('');
	let weight = $state('');
	let duration = $state('');
	let notes = $state('');

	function openEditor() {
		reps = String(set.reps);
		weight = formatWeight(toDisplayWeight(set.weight, prefs.weightUnit));
		duration = formatDuration(set.duration ?? 0);
		notes = set.notes;
		failed = false;
		editing = true;
	}

	async function save() {
		saving = true;
		failed = false;

		const updated: Set = {
			...set,
			weight: toStoredWeight(Number(weight || 0), prefs.weightUnit),
			weightUnit: 'kg',
			reps: Number(reps || 0),
			duration: Number(duration || 0),
			notes
		};

		try {
			const response = await fetch(`/api/sets/${set.objectId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updated)
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			onchange?.(await response.json());
			editing = false;
		} catch (error) {
			console.error('Could not update the set: ', error);
			failed = true;
		} finally {
			saving = false;
		}
	}

	const mark = $derived(
		comparison === undefined
			? null
			: comparison > 0
				? { icon: 'trendUp' as const, label: t.sets.better, tone: 'up' }
				: comparison < 0
					? { icon: 'trendDown' as const, label: t.sets.worse, tone: 'down' }
					: { icon: 'equal' as const, label: t.sets.same, tone: 'same' }
	);
</script>

<div class="row" class:readonly>
	<p class="value tnum">
		{#if timed}
			{t.sets.forMinutes(formatDuration(set.duration ?? 0))}
		{:else}
			{set.reps}
			<span class="unit">{t.sets.repsShort}</span>
			<span class="at">{t.sets.at}</span>
			{displayWeight(set.weight, prefs.weightUnit)}
		{/if}
	</p>

	{#if mark}
		<span class="mark {mark.tone}" title={mark.label}>
			<Icon name={mark.icon} size={1} label={mark.label} />
		</span>
	{/if}

	{#if !readonly}
		<Button
			variant="ghost"
			size="sm"
			iconOnly
			icon="pencil"
			label={t.common.edit}
			onclick={openEditor}
		/>
	{/if}
</div>

{#if set.notes}
	<p class="notes">{set.notes}</p>
{/if}

<Dialog bind:open={editing} title={t.sets.editSet}>
	<SetEditor
		bind:reps
		bind:weight
		bind:duration
		bind:notes
		{timed}
		idPrefix="edit-set-{set.objectId}"
		onsubmit={save}
	/>
	{#if failed}
		<p class="error" role="alert">{t.errors.saveFailed}</p>
	{/if}

	{#snippet footer()}
		<Button
			variant="ghost"
			icon="trash"
			onclick={() => {
				editing = false;
				confirming = true;
			}}
		>
			{t.common.delete}
		</Button>
		<Button variant="primary" class="save" busy={saving} onclick={save}>{t.common.save}</Button>
	{/snippet}
</Dialog>

<ConfirmDialog
	bind:open={confirming}
	title={t.confirm.deleteSet}
	onconfirm={() => ondelete?.(set)}
/>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch);
	}

	.value {
		flex: 1;
		min-width: 0;
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.unit,
	.at {
		font-weight: 400;
		color: var(--ink-subtle);
	}

	.mark {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
	}

	.mark.up {
		color: var(--positive);
	}

	.mark.down {
		color: var(--danger);
	}

	.mark.same {
		color: var(--ink-subtle);
	}

	.notes {
		margin-top: calc(-1 * var(--space-1));
		padding-bottom: var(--space-1);
		font-size: var(--text-xs);
		color: var(--ink-muted);
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}

	:global(dialog footer .save) {
		margin-left: auto;
	}
</style>
