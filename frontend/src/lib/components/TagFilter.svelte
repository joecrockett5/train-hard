<script lang="ts">
	import TagBadge from './TagBadge.svelte';
	import Button from '$ui/Button.svelte';
	import type { Tag } from '$lib/types';
	import { sortTags } from '$lib/tags';
	import { t } from '$lib/i18n';

	/**
	 * Filtering a list by tag.
	 *
	 * Any, not all: the tags are workout types, so picking Push and Pull means
	 * "the exercises I could do on either day" rather than exercises that are
	 * somehow both.
	 */
	type Props = {
		/** Every tag that appears on something in the list being filtered. */
		tags: Tag[];
		/** The ids currently filtered by. Bound, so the caller filters on it. */
		selected?: string[];
		/**
		 * Fired whenever the reader changes the filter.
		 *
		 * The caller resets its pager from here rather than by watching
		 * `selected`: an effect that writes the page number re-runs on the
		 * pager's own writes, and every click on page 2 goes straight back to
		 * page 1.
		 */
		onchange?: (selected: string[]) => void;
	};

	let { tags, selected = $bindable([]), onchange }: Props = $props();

	const available = $derived(sortTags(tags));
	const selectedIds = $derived(new Set(selected));

	function toggle(tag: Tag) {
		const id = tag.objectId ?? '';

		selected = selectedIds.has(id) ? selected.filter((each) => each !== id) : [...selected, id];
		onchange?.(selected);
	}

	function clear() {
		selected = [];
		onchange?.(selected);
	}
</script>

{#if available.length > 0}
	<div class="filter" role="group" aria-label={t.tags.title}>
		{#each available as tag (tag.objectId)}
			<TagBadge
				{tag}
				interactive
				action="filter"
				muted={!selectedIds.has(tag.objectId ?? '')}
				onclick={() => toggle(tag)}
			/>
		{/each}
		{#if selected.length > 0}
			<Button variant="ghost" size="sm" onclick={clear}>{t.common.clear}</Button>
		{/if}
	</div>
{/if}

<style>
	.filter {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
</style>
