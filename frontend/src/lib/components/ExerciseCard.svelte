<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import Dialog from '$ui/Dialog.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import Icon from '$ui/Icon.svelte';
	import Skeleton from '$ui/Skeleton.svelte';
	import TagBadge from './TagBadge.svelte';
	import SetRow from './SetRow.svelte';
	import SetEditor from './SetEditor.svelte';
	import type { Exercise, Set } from '$lib/types';
	import {
		compareSet,
		pastSessions,
		suggestedWeight,
		summariseSets,
		type PastSession
	} from '$lib/sets';
	import { sortTags } from '$lib/tags';
	import { formatWeight, toDisplayWeight, toStoredWeight } from '$lib/units';
	import { preferences } from '$lib/preferences.svelte';
	import { t } from '$lib/i18n';
	import { mediumDate } from '$lib/i18n/format';

	/**
	 * An exercise inside a workout, with its sets.
	 *
	 * Collapsed to a summary by default. A workout is a list of eight
	 * exercises and you are logging one of them; expanded, all eight would be
	 * a screen and a half of scrolling to reach the one in front of you.
	 */
	type Props = {
		exercise: Exercise;
		workoutId: string;
		onremove: (exercise: Exercise) => void | Promise<void>;
	};

	let { exercise, workoutId, onremove }: Props = $props();

	const prefs = preferences();

	const timed = $derived(exercise.kind === 'time');
	const tags = $derived(sortTags(exercise.tags ?? []));

	/*
	 * Seeded once. The workout keys these cards by join id, so a different
	 * appearance of the same exercise is a different component rather than
	 * this one being handed new sets.
	 */
	// svelte-ignore state_referenced_locally
	let sets = $state<Set[]>(exercise.sets ?? []);
	const warmupSets = $derived(sets.filter((set) => set.setType === 'warmup'));
	const workingSets = $derived(sets.filter((set) => set.setType !== 'warmup'));

	const summary = $derived(summariseSets(sets, { timed, unit: prefs.weightUnit }));

	let expanded = $state(false);
	let removing = $state(false);
	let creating = $state<'warmup' | 'working' | null>(null);
	let failed = $state(false);

	/** The previous sessions of this exercise, fetched the first time it opens. */
	let history = $state<PastSession[]>([]);
	let historyLoaded = $state(false);
	let viewing = $state<PastSession | null>(null);

	/** The join the sets hang off. Present from the detail endpoint. */
	// svelte-ignore state_referenced_locally
	let joinId = $state(exercise.joinId ?? '');

	$effect(() => {
		if (expanded && !historyLoaded) {
			loadHistory();
		}
	});

	async function loadHistory() {
		historyLoaded = true;

		try {
			const response = await fetch(`/api/sets/recent?exercise=${exercise.objectId}`);

			// An exercise with no earlier session comes back with an empty
			// list, which is a fact about the data rather than a failure.
			if (response.ok) {
				const { sessions } = await response.json();
				history = pastSessions(sessions);
			}
		} catch (error) {
			console.error(`Could not read history for ${exercise.name}: `, error);
			historyLoaded = false;
		}
	}

	/**
	 * The join id, fetched only if the page did not already have it.
	 *
	 * The workout detail endpoint carries it, and so does the response to
	 * adding an exercise, so this is a fallback rather than the path. The old
	 * UI fetched it before *every* set it logged.
	 */
	async function resolveJoin(): Promise<string> {
		if (joinId) {
			return joinId;
		}

		const response = await fetch(
			`/api/exercise-joins?workout=${workoutId}&exercise=${exercise.objectId}`
		);

		if (!response.ok) {
			throw new Error(`Could not find the exercise in this workout (${response.status})`);
		}

		const [join] = await response.json();
		joinId = join?.objectId ?? '';

		if (!joinId) {
			throw new Error('The exercise is not joined to this workout');
		}

		return joinId;
	}

	// ---- logging a set ------------------------------------------------------

	let editorOpen = $state(false);
	let editorType = $state<'warmup' | 'working'>('working');
	let reps = $state('');
	let weight = $state('');
	let duration = $state('');
	let notes = $state('');

	function openEditor(type: 'warmup' | 'working') {
		editorType = type;
		reps = '';
		duration = '';
		notes = '';
		failed = false;

		const suggestion = suggestedWeight(type === 'warmup' ? warmupSets : workingSets, history, type);
		weight =
			suggestion === undefined ? '' : formatWeight(toDisplayWeight(suggestion, prefs.weightUnit));

		editorOpen = true;
	}

	async function logSet() {
		const type = editorType;
		creating = type;
		failed = false;

		try {
			const exerciseJoinId = await resolveJoin();

			const response = await fetch('/api/sets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					setType: type,
					// Typed in the unit on screen, stored in kilograms.
					weight: toStoredWeight(Number(weight || 0), prefs.weightUnit),
					weightUnit: 'kg',
					reps: Number(reps || 0),
					duration: Number(duration || 0),
					notes,
					exerciseJoinId
				})
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			sets = [...sets, await response.json()];
			editorOpen = false;
		} catch (error) {
			console.error(`Could not log a set for ${exercise.name}: `, error);
			failed = true;
		} finally {
			creating = null;
		}
	}

	async function deleteSet(set: Set) {
		try {
			const response = await fetch(`/api/sets/${set.objectId}`, { method: 'DELETE' });

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			sets = sets.filter((each) => each.objectId !== set.objectId);
		} catch (error) {
			console.error('Could not delete the set: ', error);
		}
	}

	function replaceSet(updated: Set) {
		sets = sets.map((each) => (each.objectId === updated.objectId ? updated : each));
	}

	/**
	 * The session to measure this one against: the most recent one before it.
	 */
	const lastSession = $derived(history.at(-1));
</script>

<Card padded={false} class="exercise">
	<button
		type="button"
		class="head"
		aria-expanded={expanded}
		aria-label={expanded ? t.sets.collapse(exercise.name) : t.sets.expand(exercise.name)}
		onclick={() => (expanded = !expanded)}
	>
		<span class="identity">
			<span class="name">{exercise.name}</span>
			{#if exercise.description}<span class="description">{exercise.description}</span>{/if}
			{#if tags.length > 0}
				<span class="tags">
					{#each tags as tag (tag.objectId)}
						<TagBadge {tag} />
					{/each}
				</span>
			{/if}
		</span>

		{#if !expanded && summary.length > 0}
			<span class="summary tnum">
				{#each summary as entry, index (index)}<span class:warmup={entry.warmup}>{entry.label}</span
					>{#if index < summary.length - 1}<span class="sep">,</span>{/if}{/each}
			</span>
		{/if}

		<Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={1.1} class="caret" />
	</button>

	{#if expanded}
		<div class="body">
			{#if history.length > 0}
				<section>
					<h3>{t.sets.history}</h3>
					<div class="history">
						{#each history as session (session.workoutId)}
							<Button variant="outline" size="sm" onclick={() => (viewing = session)}>
								{mediumDate(session.workoutDate)}
							</Button>
						{/each}
					</div>
				</section>
			{/if}

			<!--
				No warm-up for a timed exercise: a cardio session is just its
				intervals, and splitting them in two asked a question nobody
				wanted to answer. Warm-ups logged before this are still shown.
			-->
			{#if !timed || warmupSets.length > 0}
				<section>
					<h3>{timed ? t.sets.warmup : t.sets.warmupSets}</h3>
					<ul class="sets">
						{#each warmupSets as set (set.objectId)}
							<li>
								<SetRow {set} {timed} onchange={replaceSet} ondelete={deleteSet} />
							</li>
						{/each}
						{#if creating === 'warmup'}
							<li><Skeleton height="2.75rem" /></li>
						{/if}
					</ul>
					{#if !timed}
						<Button variant="outline" icon="plus" full onclick={() => openEditor('warmup')}>
							{t.sets.newWarmup}
						</Button>
					{/if}
				</section>
			{/if}

			<section>
				<h3>{timed ? t.sets.intervals : t.sets.working}</h3>
				<ul class="sets">
					{#each workingSets as set, index (set.objectId)}
						<li>
							<SetRow
								{set}
								{timed}
								comparison={compareSet(set, lastSession?.working[index], { timed })}
								onchange={replaceSet}
								ondelete={deleteSet}
							/>
						</li>
					{/each}
					{#if creating === 'working'}
						<li><Skeleton height="2.75rem" /></li>
					{/if}
				</ul>
				{#if workingSets.length === 0 && creating !== 'working'}
					<p class="none">{t.sets.none}</p>
				{/if}
				<Button variant="primary" icon="plus" full onclick={() => openEditor('working')}>
					{timed ? t.sets.newInterval : t.sets.newWorking}
				</Button>
			</section>

			<Button variant="ghost" icon="trash" size="sm" onclick={() => (removing = true)}>
				{t.common.remove}
			</Button>
		</div>
	{/if}
</Card>

<Dialog
	bind:open={editorOpen}
	title={editorType === 'warmup'
		? t.sets.newWarmup
		: timed
			? t.sets.newInterval
			: t.sets.newWorking}
	description={exercise.name}
>
	<SetEditor
		bind:reps
		bind:weight
		bind:duration
		bind:notes
		{timed}
		idPrefix="new-set-{exercise.objectId}"
		onsubmit={logSet}
	/>
	{#if failed}
		<p class="error" role="alert">{t.errors.logSet}</p>
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (editorOpen = false)}>{t.common.cancel}</Button>
		<Button variant="primary" class="save" busy={creating !== null} onclick={logSet}>
			{t.common.add}
		</Button>
	{/snippet}
</Dialog>

<Dialog
	open={viewing !== null}
	title={viewing ? t.sets.historyOn(mediumDate(viewing.workoutDate)) : ''}
	onclose={() => (viewing = null)}
>
	{#if viewing}
		{@const index = history.indexOf(viewing)}
		{@const before = index > 0 ? history[index - 1] : undefined}
		{#if viewing.warmup.length > 0}
			<section>
				<h3>{timed ? t.sets.warmup : t.sets.warmupSets}</h3>
				<ul class="sets">
					{#each viewing.warmup as set (set.objectId)}
						<li><SetRow {set} {timed} readonly /></li>
					{/each}
				</ul>
			</section>
		{/if}
		<section>
			<h3>{timed ? t.sets.intervals : t.sets.working}</h3>
			<ul class="sets">
				{#each viewing.working as set, position (set.objectId)}
					<li>
						<SetRow
							{set}
							{timed}
							readonly
							comparison={compareSet(set, before?.working[position], { timed })}
						/>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</Dialog>

<ConfirmDialog
	bind:open={removing}
	title={t.confirm.removeFromWorkout(exercise.name)}
	body={t.confirm.removeFromWorkoutBody}
	confirmLabel={t.common.remove}
	onconfirm={() => onremove(exercise)}
/>

<style>
	:global(.exercise) {
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-4);
		text-align: left;
	}

	.identity {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
		flex: 1;
	}

	.name {
		font-size: var(--text-base);
		font-weight: 600;
		line-height: var(--leading-snug);
	}

	.description {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-top: var(--space-1);
	}

	/*
	 * Wraps rather than truncating: on a long exercise the later sets are the
	 * ones worth seeing, so an ellipsis would hide the useful half.
	 */
	.summary {
		max-width: 45%;
		text-align: right;
		font-size: var(--text-xs);
		line-height: var(--leading-snug);
		color: var(--ink-muted);
	}

	.summary .warmup {
		font-style: italic;
		opacity: 0.75;
	}

	.summary .sep {
		margin-right: 2px;
	}

	.head :global(.caret) {
		color: var(--ink-subtle);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: 0 var(--space-4) var(--space-4);
		border-top: 1px solid var(--line);
		padding-top: var(--space-4);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	h3 {
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-subtle);
	}

	.history {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.sets {
		display: flex;
		flex-direction: column;
	}

	.sets li + li {
		border-top: 1px solid var(--line);
	}

	.none {
		font-size: var(--text-sm);
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
