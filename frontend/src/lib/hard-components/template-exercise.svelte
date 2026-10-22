<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import TagBadge from './tag-badge.svelte';
	import type { Exercise } from '$lib/types';
	import { sortTags } from '$lib/tags';

	/**
	 * An exercise as it sits in a template.
	 *
	 * The workout's card without any of the set handling: a template says
	 * which exercises to do, so there is nothing to expand into and no reps
	 * or weight to log. What is left is the name, the tags, and a way to take
	 * it back out.
	 */

	export let exercise: Exercise;
	export let removalCallback: (exercise: Exercise) => void;

	$: tags = sortTags(exercise.tags ?? []);
</script>

<Card.Root class="mt-4">
	<Dialog.Root>
		<Dialog.Trigger class={`float-right top-4 right-4 ${buttonVariants({ variant: 'ghost' })}`}
			>Remove</Dialog.Trigger
		>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Remove {exercise.name} from this template?</Dialog.Title>
				<Dialog.Description>The exercise itself is kept.</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'ghost' })}>Cancel</Dialog.Close>
				<Dialog.Close
					on:click={() => removalCallback(exercise)}
					class={buttonVariants({ variant: 'destructive' })}>Remove</Dialog.Close
				>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
	<Card.Header class="w-2/3">
		<Card.Title>{exercise.name}</Card.Title>
		{#if exercise.description}
			<Card.Description>{exercise.description}</Card.Description>
		{/if}
	</Card.Header>
	{#if tags.length > 0}
		<Card.Content>
			<div class="flex flex-wrap gap-2">
				{#each tags as tag (tag.objectId)}
					<TagBadge {tag} />
				{/each}
			</div>
		</Card.Content>
	{/if}
</Card.Root>
