<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import Import from 'lucide-svelte/icons/download';
	import TagBadge from './tag-badge.svelte';
	import TagFilter from './tag-filter.svelte';
	import { filterByTags, sortTags } from '$lib/tags';
	import type { Template } from '$lib/types';

	/**
	 * Picking a template to pull exercises from.
	 *
	 * Only picks. What that means is the caller's: creating a workout holds
	 * the choice until the workout exists, while a workout already open adds
	 * the exercises straight away.
	 */

	export let templates: Template[] = [];
	export let onPick: (template: Template) => void | Promise<void>;
	export let label = 'Import template';
	/** Shown under the title, for a caller that wants to say what picking does. */
	export let description = 'Its exercises are added to this workout.';

	let open = false;
	let selectedTagIds: string[] = [];

	$: filterableTags = [
		...new Map(
			templates.flatMap((template) => template.tags ?? []).map((tag) => [tag.objectId, tag])
		).values()
	];

	$: matching = filterByTags(templates, selectedTagIds);

	async function pick(template: Template) {
		open = false;
		await onPick(template);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' }) + ' mt-1 w-full text-gray-400'}>
		<Import class="mr-2 h-4 w-4" />
		{label}
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{label}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>

		{#if templates.length === 0}
			<p class="text-muted-foreground mt-4 text-center text-sm">
				No templates yet. Make one on the Templates screen.
			</p>
		{:else}
			<TagFilter tags={filterableTags} bind:selected={selectedTagIds} />

			<div class="mt-2 flex flex-col gap-2">
				{#each matching as template (template.objectId)}
					<button
						type="button"
						class="hover:bg-accent rounded-md border p-3 text-left"
						on:click={() => pick(template)}
					>
						<span class="font-semibold">{template.name}</span>
						{#if template.description}
							<p class="text-muted-foreground text-sm">{template.description}</p>
						{/if}
						{#if (template.tags ?? []).length > 0}
							<div class="mt-2 flex flex-wrap gap-2">
								{#each sortTags(template.tags ?? []) as tag (tag.objectId)}
									<TagBadge {tag} />
								{/each}
							</div>
						{/if}
					</button>
				{/each}

				{#if matching.length === 0}
					<p class="text-muted-foreground mt-4 text-center text-sm">No templates match.</p>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
