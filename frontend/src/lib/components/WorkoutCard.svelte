<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Icon from '$ui/Icon.svelte';
	import type { WorkoutInfo } from '$lib/types';
	import { relativeDay, longDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';

	/**
	 * A workout in a list. The whole card is the link -- on a phone the card
	 * is the target you actually aim at, not the title inside it.
	 */
	type Props = {
		workout: WorkoutInfo;
		/** How many exercises it holds, when the caller knows. */
		exerciseCount?: number;
		/** `relative` for recent lists, `none` on a screen already showing the day. */
		dateStyle?: 'relative' | 'long' | 'none';
	};

	let { workout, exerciseCount, dateStyle = 'relative' }: Props = $props();
</script>

<Card
	href="/workouts/{workout.objectId}"
	padded={false}
	label={t.workouts.openWorkout(workout.title)}
>
	<div class="inner">
		<div class="text">
			<p class="title">{workout.title}</p>
			<p class="meta">
				{#if dateStyle === 'relative'}
					<span>{relativeDay(workout.workoutDate)}</span>
				{:else if dateStyle === 'long'}
					<span>{longDate(workout.workoutDate)}</span>
				{/if}
				{#if exerciseCount !== undefined}
					<span>{t.workouts.exerciseCount(exerciseCount)}</span>
				{/if}
			</p>
			{#if workout.notes}<p class="notes">{workout.notes}</p>{/if}
		</div>
		<Icon name="chevronRight" size={1.1} class="caret" />
	</div>
</Card>

<style>
	.inner {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
		min-height: var(--touch);
	}

	.text {
		flex: 1;
		min-width: 0;
	}

	.title {
		font-size: var(--text-sm);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.notes {
		margin-top: var(--space-1);
		font-size: var(--text-xs);
		color: var(--ink-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inner :global(.caret) {
		color: var(--ink-subtle);
	}
</style>
