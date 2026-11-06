<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The one container. A card is a surface with a hairline and a radius;
	 * everything on a screen sits in one, or in the gap between two.
	 */
	type Props = {
		/** Wraps the whole card in a link, so the card is the tap target. */
		href?: string;
		padded?: boolean;
		/** Removes the border and background, for grouping without a box. */
		flat?: boolean;
		class?: string;
		label?: string;
		children: Snippet;
	};

	let {
		href,
		padded = true,
		flat = false,
		class: className = '',
		label,
		children
	}: Props = $props();

	const classes = $derived(
		['card', padded ? 'padded' : '', flat ? 'flat' : '', href ? 'linked' : '', className]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if href}
	<a {href} class={classes} aria-label={label}>{@render children()}</a>
{:else}
	<section class={classes} aria-label={label}>{@render children()}</section>
{/if}

<style>
	.card {
		display: block;
		background: var(--surface-raised);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
	}

	.padded {
		padding: var(--space-4);
	}

	.flat {
		background: transparent;
		border-color: transparent;
		box-shadow: none;
	}

	.linked {
		transition:
			border-color var(--dur-fast) var(--ease),
			transform var(--dur-fast) var(--ease);
	}

	.linked:hover {
		border-color: var(--line-strong);
	}

	.linked:active {
		transform: scale(0.995);
	}
</style>
