<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { Tag } from '$lib/types';
	import X from 'lucide-svelte/icons/x';

	export let tag: Tag;
	/** Renders a button, for tags that can be toggled or removed. */
	export let interactive = false;
	/** Dims the badge, for a filter chip that is not currently selected. */
	export let muted = false;
	/**
	 * Shows an × on an applied tag, so that clicking it to take it off is an
	 * offer rather than something to discover. Opacity alone carries that
	 * distinction otherwise, which is subtle -- and more so for the lighter
	 * colours in the palette than the darker ones.
	 */
	export let removable = false;
	/**
	 * What clicking does, for the button's accessible name -- the label alone
	 * reads as "Legs" whether it is being added or removed, which says
	 * nothing about what the button does or which state it is in.
	 */
	export let action: 'toggle' | 'filter' = 'toggle';
	let className: string = '';
	export { className as class };

	$: label =
		action === 'filter'
			? `${muted ? 'Filter by' : 'Stop filtering by'} ${tag.name}`
			: `${muted ? 'Add' : 'Remove'} tag ${tag.name}`;
</script>

{#if interactive}
	<button
		type="button"
		on:click
		class="rounded-full"
		style="--tag: {tag.colorHex}"
		aria-pressed={!muted}
		aria-label={label}
	>
		<Badge variant="tag" class={`gap-1 ${muted ? 'opacity-40 hover:opacity-70' : ''} ${className}`}>
			{tag.name}
			{#if removable && !muted}
				<X class="h-3 w-3" aria-hidden="true" />
			{/if}
		</Badge>
	</button>
{:else}
	<span style="--tag: {tag.colorHex}">
		<Badge variant="tag" class={className}>{tag.name}</Badge>
	</span>
{/if}
