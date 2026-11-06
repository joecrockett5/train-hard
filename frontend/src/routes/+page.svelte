<script lang="ts">
	import { goto } from '$app/navigation';
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import WorkoutCard from '$lib/components/WorkoutCard.svelte';
	import WorkoutDialog from '$lib/components/WorkoutDialog.svelte';
	import WeighInDialog from '$lib/components/WeighInDialog.svelte';
	import WeightChart from '$lib/components/WeightChart.svelte';
	import { frequentExercises, isFirstRun, summariseWorkouts } from '$lib/dashboard';
	import { importTemplate } from '$lib/templates';
	import { summarise } from '$lib/weight-chart';
	import { formatWeight, toDisplayWeight } from '$lib/units';
	import { preferences } from '$lib/preferences.svelte';
	import { todayIso } from '$lib/dates';
	import { longDate, relativeDay, timestampDay } from '$lib/i18n/format';
	import { t } from '$lib/i18n';
	import type { BodyWeight, Template, WorkoutInfo } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const prefs = preferences();
	const today = todayIso();

	let workouts = $state<WorkoutInfo[]>([]);
	let weighIns = $state<BodyWeight[]>([]);

	// Taken from the server on load and on every navigation back here, so a
	// workout started elsewhere shows up without a reload.
	$effect(() => {
		workouts = data.workouts;
	});
	$effect(() => {
		weighIns = data.bodyWeights;
	});

	const summary = $derived(summariseWorkouts(workouts, today));
	const frequent = $derived(frequentExercises(data.exercises, data.joins));
	const weight = $derived(
		summarise(
			weighIns.map((entry) => ({
				...entry,
				weight: toDisplayWeight(entry.weight, prefs.weightUnit)
			}))
		)
	);
	const firstRun = $derived(
		isFirstRun({
			workouts: workouts.length,
			exercises: data.exercises.length,
			weighIns: weighIns.length
		})
	);

	let startingWorkout = $state(false);
	let loggingWeight = $state(false);

	/** Starts the workout, pulls in a template if one was picked, and opens it. */
	async function started(workout: WorkoutInfo, template: Template | null) {
		if (template) {
			try {
				await importTemplate(template.objectId ?? '', workout.objectId ?? '');
			} catch (error) {
				// The workout started either way, which is what the button
				// promised; landing on it beats refusing over the import.
				console.error('Could not import the template: ', error);
			}
		}

		await goto(`/workouts/${workout.objectId}`);
	}

	function weighed(entry: BodyWeight) {
		weighIns = [...weighIns, entry];
	}
</script>

<svelte:head>
	<title>{t.app.name}</title>
</svelte:head>

<header class="screen-head">
	<div>
		<p class="eyebrow">{longDate(today)}</p>
		<h1>{t.dashboard.greeting(prefs.name)}</h1>
	</div>
</header>

{#if firstRun}
	<Card>
		<EmptyState icon="flame" title={t.dashboard.firstRun} body={t.dashboard.firstRunBody}>
			{#snippet action()}
				<Button variant="primary" icon="plus" onclick={() => (startingWorkout = true)}>
					{t.dashboard.startWorkout}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{:else}
	<!-- The point of the screen, so it is the one primary action on it. -->
	<Button variant="primary" size="lg" icon="plus" full onclick={() => (startingWorkout = true)}>
		{t.dashboard.startWorkout}
	</Button>

	{#if summary.today.length > 0}
		<section>
			<h2>{t.dashboard.todaysWorkouts}</h2>
			<ul>
				{#each summary.today as workout (workout.objectId)}
					<li><WorkoutCard {workout} dateStyle="none" /></li>
				{/each}
			</ul>
		</section>
	{/if}

	<div class="stats">
		<Card>
			<p class="stat-label">{t.dashboard.thisWeek}</p>
			<p class="stat tnum">{summary.thisWeek}</p>
			<p class="stat-note">
				{summary.thisWeek === 0
					? t.dashboard.streakNone
					: t.dashboard.thisWeekWorkouts(summary.thisWeek)}
			</p>
		</Card>

		<Card>
			<p class="stat-label">{t.dashboard.latestWeight}</p>
			{#if weight}
				<p class="stat tnum">{formatWeight(weight.current)}<small>{prefs.weightUnit}</small></p>
				<p class="stat-note">{relativeDay(weight.latest.entryDate)}</p>
			{:else}
				<p class="stat muted">—</p>
				<button type="button" class="stat-action" onclick={() => (loggingWeight = true)}>
					{t.dashboard.addWeighIn}
				</button>
			{/if}
		</Card>
	</div>

	<Card>
		{#if data.weightsUnavailable}
			<EmptyState icon="alert" tone="error" title={t.dashboard.progressUnavailable} />
		{:else}
			<a href="/body-weight" class="chart-link" aria-label={t.bodyWeight.title}>
				<WeightChart entries={weighIns} compact />
			</a>
		{/if}
	</Card>

	<section>
		<div class="section-head">
			<h2>{t.dashboard.recentWorkouts}</h2>
			<Button variant="ghost" size="sm" href="/workouts" iconEnd="chevronRight">
				{t.dashboard.seeAllWorkouts}
			</Button>
		</div>
		{#if summary.recent.length > 0}
			<ul>
				{#each summary.recent as workout (workout.objectId)}
					<li><WorkoutCard {workout} /></li>
				{/each}
			</ul>
		{:else}
			<Card><EmptyState icon="dumbbell" title={t.dashboard.recentWorkoutsEmpty} /></Card>
		{/if}
	</section>

	{#if frequent.length > 0}
		<section>
			<h2>{t.dashboard.frequentExercises}</h2>
			<Card padded={false}>
				<ul class="frequent">
					{#each frequent as entry (entry.exercise.objectId)}
						<li>
							<span class="name">{entry.exercise.name}</span>
							<span class="count">
								{t.dashboard.frequentExerciseSessions(entry.sessions)}
								{#if entry.lastDone}
									<span class="when">· {timestampDay(entry.lastDone)}</span>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</Card>
		</section>
	{/if}
{/if}

<WorkoutDialog
	bind:open={startingWorkout}
	date={today}
	templates={data.templates}
	onsaved={started}
/>

<WeighInDialog bind:open={loggingWeight} onsaved={weighed} />

<style>
	.screen-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.eyebrow {
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--ink-subtle);
	}

	h1 {
		font-size: var(--text-2xl);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	h2 {
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-subtle);
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.stat-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--ink-subtle);
	}

	.stat {
		font-size: var(--text-2xl);
		font-weight: 700;
		line-height: var(--leading-tight);
		letter-spacing: -0.02em;
	}

	.stat small {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--ink-muted);
	}

	.stat.muted {
		color: var(--ink-subtle);
	}

	.stat-note {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.stat-action {
		min-height: var(--touch);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--brand);
		text-align: left;
	}

	.chart-link {
		display: block;
	}

	.frequent li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: var(--touch);
		padding: var(--space-2) var(--space-4);
	}

	.frequent li + li {
		border-top: 1px solid var(--line);
	}

	.frequent .name {
		font-size: var(--text-sm);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.frequent .count {
		flex: none;
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.frequent .when {
		color: var(--ink-subtle);
	}

	@media (min-width: 52rem) {
		.stats {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
