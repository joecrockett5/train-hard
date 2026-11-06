<script lang="ts">
	import { toasts } from './toast.svelte';
	import Icon from './Icon.svelte';

	/**
	 * `aria-live="polite"` rather than an alert: a saved preference is worth
	 * mentioning after whatever the reader is doing, not instead of it.
	 */
</script>

<div class="toaster" role="status" aria-live="polite">
	{#each toasts.items as item (item.id)}
		<div class="toast" class:error={item.tone === 'error'}>
			<Icon name={item.tone === 'error' ? 'alert' : 'check'} size={1.05} />
			<span>{item.message}</span>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		/* Above the tab bar on a phone, so it does not sit under the thumb. */
		bottom: calc(var(--tab-bar) + env(safe-area-inset-bottom) + var(--space-3));
		left: 50%;
		transform: translateX(-50%);
		z-index: 60;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		align-items: center;
		width: max-content;
		max-width: calc(100vw - 2 * var(--space-4));
		pointer-events: none;
	}

	@media (min-width: 52rem) {
		.toaster {
			bottom: var(--space-6);
		}
	}

	.toast {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: var(--surface-overlay);
		border: 1px solid var(--line);
		border-radius: var(--radius-full);
		box-shadow: var(--shadow-2);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink);
		animation: rise var(--dur) var(--ease);
	}

	.toast.error {
		color: var(--danger);
		border-color: color-mix(in srgb, var(--danger) 30%, transparent);
	}

	@keyframes rise {
		from {
			transform: translateY(0.5rem);
			opacity: 0;
		}
	}
</style>
