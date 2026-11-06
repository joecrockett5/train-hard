<script lang="ts">
	type Props = { height?: string; width?: string; radius?: string; class?: string };

	let {
		height = '1rem',
		width = '100%',
		radius = 'var(--radius-md)',
		class: className = ''
	}: Props = $props();
</script>

<div
	class="skeleton {className}"
	style="height: {height}; width: {width}; border-radius: {radius}"
	aria-hidden="true"
></div>

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			var(--surface-sunken) 0%,
			var(--surface-hover) 50%,
			var(--surface-sunken) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.4s var(--ease) infinite;
	}

	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}

	/* Still a placeholder, just a still one. */
	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
			background: var(--surface-sunken);
		}
	}
</style>
