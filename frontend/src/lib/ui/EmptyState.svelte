<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	/**
	 * What a screen says when it has nothing to show.
	 *
	 * Always a reason and a way out, never just an absence. And never blame
	 * the reader: a list is empty for several reasons and only one of them is
	 * something they did.
	 */
	type Props = {
		icon?: IconName;
		title: string;
		body?: string;
		tone?: 'empty' | 'error';
		class?: string;
		action?: Snippet;
	};

	let { icon, title, body, tone = 'empty', class: className = '', action }: Props = $props();
</script>

<div class="empty {tone} {className}" role={tone === 'error' ? 'alert' : undefined}>
	{#if icon}
		<span class="glyph"><Icon name={icon} size={1.5} /></span>
	{/if}
	<p class="title">{title}</p>
	{#if body}<p class="body">{body}</p>{/if}
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-8) var(--space-4);
		text-align: center;
	}

	.glyph {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		margin-bottom: var(--space-1);
		border-radius: var(--radius-full);
		background: var(--surface-sunken);
		color: var(--ink-subtle);
	}

	.error .glyph {
		background: var(--danger-wash);
		color: var(--danger);
	}

	.title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink);
	}

	.body {
		max-width: 26rem;
		font-size: var(--text-sm);
		line-height: var(--leading-snug);
		color: var(--ink-muted);
	}

	.action {
		margin-top: var(--space-2);
	}
</style>
