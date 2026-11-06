<script lang="ts">
	import Icon from '$ui/Icon.svelte';
	import type { Tag } from '$lib/types';

	/**
	 * A tag, coloured from the single hex the tag stores.
	 *
	 * Everything is mixed from that one value, so a tag needs to store one
	 * colour rather than a matched set of three that could drift apart. The
	 * stored value is the mid-tone used for the label; the fill and border are
	 * the same colour at low opacity, which over white gives a pale wash and
	 * over near-black gives a muted version of the same hue. Dark mode lifts
	 * the label towards white, because a mid-tone that reads on paper does not
	 * read on a dark surface.
	 */
	type Props = {
		tag: Tag;
		/** Renders a button, for tags that can be toggled. */
		interactive?: boolean;
		/** Dims it, for a chip that is not currently selected. */
		muted?: boolean;
		/**
		 * Shows a × on an applied tag, so taking it off is an offer rather
		 * than something to discover. Opacity alone carries that distinction
		 * otherwise, which is subtle -- more so for the lighter colours.
		 */
		removable?: boolean;
		/**
		 * What clicking does, for the accessible name. The label alone reads
		 * as "Legs" whether it is being added or removed, which says nothing
		 * about what the button does or which state it is in.
		 */
		action?: 'toggle' | 'filter';
		onclick?: () => void;
	};

	let {
		tag,
		interactive = false,
		muted = false,
		removable = false,
		action = 'toggle',
		onclick
	}: Props = $props();

	const label = $derived(
		action === 'filter'
			? muted
				? `Filter by ${tag.name}`
				: `Stop filtering by ${tag.name}`
			: muted
				? `Add tag ${tag.name}`
				: `Remove tag ${tag.name}`
	);
</script>

{#if interactive}
	<button
		type="button"
		class="chip tag"
		class:muted
		style="--tag: {tag.colorHex}"
		aria-pressed={!muted}
		aria-label={label}
		{onclick}
	>
		<span>{tag.name}</span>
		{#if removable && !muted}
			<Icon name="close" size={0.85} />
		{/if}
	</button>
{:else}
	<span class="chip tag" style="--tag: {tag.colorHex}">{tag.name}</span>
{/if}

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 0.2rem var(--space-3);
		border: 1px solid transparent;
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: 600;
		line-height: 1.5;
		white-space: nowrap;
	}

	.tag {
		background: color-mix(in srgb, var(--tag, currentColor) 12%, transparent);
		border-color: color-mix(in srgb, var(--tag, currentColor) 32%, transparent);
		color: var(--tag, currentColor);
	}

	:global(:root[data-theme='dark']) .tag {
		background: color-mix(in srgb, var(--tag, currentColor) 22%, transparent);
		border-color: color-mix(in srgb, var(--tag, currentColor) 42%, transparent);
		color: color-mix(in srgb, var(--tag, currentColor) 58%, white);
	}

	button.tag {
		/* A chip is small; the target around it is not. */
		min-height: var(--touch);
		transition: opacity var(--dur-fast) var(--ease);
	}

	button.tag.muted {
		opacity: 0.45;
	}

	button.tag.muted:hover {
		opacity: 0.75;
	}
</style>
