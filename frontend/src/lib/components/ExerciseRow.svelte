<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import TagBadge from './TagBadge.svelte';
	import Badge from '$ui/Badge.svelte';
	import type { Exercise } from '$lib/types';
	import { sortTags } from '$lib/tags';
	import { t } from '$lib/i18n';

	/**
	 * An exercise in a list.
	 *
	 * `onpick` turns the whole card into a button, which is what the
	 * add-an-exercise picker wants; `onedit` adds a pencil, which is what the
	 * exercises screen wants. Neither, and it is a plain card.
	 */
	type Props = {
		exercise: Exercise;
		onpick?: (exercise: Exercise) => void;
		onedit?: (exercise: Exercise) => void;
	};

	let { exercise, onpick, onedit }: Props = $props();

	const tags = $derived(sortTags(exercise.tags ?? []));
</script>

<Card padded={false} class="row">
	<div class="inner">
		{#if onpick}
			<button type="button" class="pick" onclick={() => onpick(exercise)}>
				<span class="name">{exercise.name}</span>
				{#if exercise.description}<span class="description">{exercise.description}</span>{/if}
			</button>
		{:else}
			<div class="pick static">
				<span class="name">{exercise.name}</span>
				{#if exercise.description}<span class="description">{exercise.description}</span>{/if}
			</div>
		{/if}

		{#if exercise.kind === 'time'}
			<Badge>{t.exercises.kindTime}</Badge>
		{/if}

		{#if onedit}
			<Button
				variant="ghost"
				size="sm"
				iconOnly
				icon="pencil"
				label={t.exercises.editExercise(exercise.name)}
				onclick={() => onedit(exercise)}
			/>
		{/if}
	</div>

	{#if tags.length > 0}
		<div class="tags">
			{#each tags as tag (tag.objectId)}
				<TagBadge {tag} />
			{/each}
		</div>
	{/if}
</Card>

<style>
	.inner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
	}

	.pick {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
		min-height: var(--touch);
		justify-content: center;
		text-align: left;
	}

	.name {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.description {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		padding: 0 var(--space-4) var(--space-3);
	}
</style>
