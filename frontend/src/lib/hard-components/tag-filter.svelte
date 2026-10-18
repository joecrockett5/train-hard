<script lang="ts">
	import TagBadge from './tag-badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Tag } from '$lib/types';
	import { sortTags } from '$lib/tags';

	/** Every tag that appears on something in the list being filtered. */
	export let tags: Tag[] = [];
	/** The ids currently filtered by. Bound, so the caller filters on it. */
	export let selected: string[] = [];

	$: available = sortTags(tags);
	$: selectedIds = new Set(selected);

	function toggle(tag: Tag) {
		const id = tag.objectId ?? '';

		selected = selectedIds.has(id) ? selected.filter((each) => each !== id) : [...selected, id];
	}
</script>

{#if available.length > 0}
	<div class="mt-4 flex flex-wrap items-center gap-2">
		{#each available as tag (tag.objectId)}
			<TagBadge
				{tag}
				interactive
				action="filter"
				muted={!selectedIds.has(tag.objectId ?? '')}
				on:click={() => toggle(tag)}
			/>
		{/each}
		{#if selected.length > 0}
			<Button variant="ghost" size="sm" class="h-6 px-2 text-xs" on:click={() => (selected = [])}>
				Clear
			</Button>
		{/if}
	</div>
{/if}
