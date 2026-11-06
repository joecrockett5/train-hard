<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		tone?: 'neutral' | 'brand' | 'danger' | 'positive';
		class?: string;
		children: Snippet;
	};

	let { tone = 'neutral', class: className = '', children }: Props = $props();
</script>

<span class="badge {tone} {className}">{@render children()}</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 0.15rem var(--space-2);
		border: 1px solid transparent;
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: 600;
		line-height: 1.5;
		white-space: nowrap;
	}

	.neutral {
		background: var(--surface-sunken);
		border-color: var(--line);
		color: var(--ink-muted);
	}

	.brand {
		background: var(--brand-wash);
		border-color: color-mix(in srgb, var(--brand) 28%, transparent);
		color: var(--brand);
	}

	.danger {
		background: var(--danger-wash);
		border-color: color-mix(in srgb, var(--danger) 30%, transparent);
		color: var(--danger);
	}

	.positive {
		background: color-mix(in srgb, var(--positive) 12%, transparent);
		border-color: color-mix(in srgb, var(--positive) 30%, transparent);
		color: var(--positive);
	}
</style>
