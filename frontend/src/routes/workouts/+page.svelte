<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import Calendar from '$ui/Calendar.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import WorkoutCard from '$lib/components/WorkoutCard.svelte';
	import WorkoutDialog from '$lib/components/WorkoutDialog.svelte';
	import { swipe } from '$lib/swipe';
	import { importTemplate } from '$lib/templates';
	import { addDays, todayIso } from '$lib/dates';
	import { weekdayDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';
	import type { Template, WorkoutInfo } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let workouts = $state<WorkoutInfo[]>([]);

	$effect(() => {
		workouts = data.workouts;
	});

	/** `?date=` deep-links a day -- deleting a workout comes back this way. */
	let selected = $state(page.url.searchParams.get('date') ?? todayIso());

	const onDate = $derived(
		workouts
			.filter((workout) => workout.workoutDate === selected)
			.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
	);

	/** Days with something on them, so the month shows where the work was. */
	const marked = $derived(new Set(workouts.map((workout) => workout.workoutDate)));

	let creating = $state(false);

	async function started(workout: WorkoutInfo, template: Template | null) {
		if (template) {
			try {
				await importTemplate(template.objectId ?? '', workout.objectId ?? '');
			} catch (error) {
				console.error('Could not import the template: ', error);
			}
		}

		await goto(`/workouts/${workout.objectId}`);
	}
</script>

<svelte:head>
	<title>{t.app.name} · {t.workouts.title}</title>
</svelte:head>

<header class="screen-head">
	<h1>{t.workouts.title}</h1>
	<Button variant="primary" icon="plus" onclick={() => (creating = true)}>
		{t.workouts.newWorkout}
	</Button>
</header>

<Card>
	<Calendar bind:value={selected} {marked} />
</Card>

<!--
	Swiping moves a day, which is how the old screen worked. The target is the
	day's own list rather than the whole page, so a swipe over the calendar
	still belongs to the calendar.
-->
<section
	class="day"
	use:swipe={{
		onswipe: (direction) => (selected = addDays(selected, direction === 'left' ? 1 : -1))
	}}
>
	<div class="day-head">
		<Button
			variant="ghost"
			iconOnly
			icon="chevronLeft"
			size="sm"
			label={t.workouts.previousDay}
			onclick={() => (selected = addDays(selected, -1))}
		/>
		<h2 aria-live="polite">{weekdayDate(selected)}</h2>
		<Button
			variant="ghost"
			iconOnly
			icon="chevronRight"
			size="sm"
			label={t.workouts.nextDay}
			onclick={() => (selected = addDays(selected, 1))}
		/>
	</div>

	{#if onDate.length > 0}
		<ul>
			{#each onDate as workout (workout.objectId)}
				<li><WorkoutCard {workout} dateStyle="none" /></li>
			{/each}
		</ul>
	{:else}
		<Card>
			<EmptyState icon="dumbbell" title={t.workouts.noneOnDate}>
				{#snippet action()}
					<Button variant="outline" icon="plus" onclick={() => (creating = true)}>
						{t.workouts.newWorkout}
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{/if}

	<p class="hint">{t.workouts.swipeHint}</p>
</section>

<WorkoutDialog bind:open={creating} date={selected} templates={data.templates} onsaved={started} />

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

	.day {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		/* So a sideways drag is a swipe and a vertical one still scrolls. */
		touch-action: pan-y;
	}

	.day-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	h2 {
		font-size: var(--text-sm);
		font-weight: 600;
		text-align: center;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.hint {
		font-size: var(--text-xs);
		text-align: center;
		color: var(--ink-subtle);
	}

	@media (min-width: 52rem) {
		.hint {
			display: none;
		}
	}
</style>
