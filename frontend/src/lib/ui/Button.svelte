<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	/**
	 * Every button in the app.
	 *
	 * `primary` is the brand ramp with near-black ink on it -- measured, not
	 * stylistic: white falls to 1.8:1 against the amber end. There is at most
	 * one primary on a screen.
	 */
	type Props = {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		/** Renders an anchor instead of a button. */
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** Shows a spinner and blocks further presses. */
		busy?: boolean;
		/** Square, icon-only. Needs a `label`. */
		iconOnly?: boolean;
		icon?: IconName;
		/** Trailing icon, for a chevron or a count. */
		iconEnd?: IconName;
		label?: string;
		title?: string;
		full?: boolean;
		pressed?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
		[key: string]: unknown;
	};

	// svelte-ignore custom_element_props_identifier
	let {
		variant = 'secondary',
		size = 'md',
		href,
		type = 'button',
		disabled = false,
		busy = false,
		iconOnly = false,
		icon,
		iconEnd,
		label,
		title,
		full = false,
		pressed,
		class: className = '',
		onclick,
		children,
		...rest
	}: Props = $props();

	const classes = $derived(
		['btn', `v-${variant}`, `s-${size}`, iconOnly ? 'icon-only' : '', full ? 'full' : '', className]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#snippet inner()}
	{#if busy}
		<span class="spinner" aria-hidden="true"></span>
	{:else if icon}
		<Icon name={icon} size={size === 'sm' ? 1.05 : 1.2} />
	{/if}
	{#if !iconOnly}
		<span class="label">{@render children?.()}</span>
	{/if}
	{#if iconEnd && !busy}
		<Icon name={iconEnd} size={size === 'sm' ? 1.05 : 1.2} />
	{/if}
{/snippet}

{#if href}
	<a
		{href}
		class={classes}
		aria-label={label}
		aria-disabled={disabled ? 'true' : undefined}
		{title}
		{onclick}
		{...rest}
	>
		{@render inner()}
	</a>
{:else}
	<button
		{type}
		class={classes}
		disabled={disabled || busy}
		aria-label={label}
		aria-pressed={pressed}
		{title}
		{onclick}
		{...rest}
	>
		{@render inner()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		/* Nothing you tap is allowed below this, whatever the visual size. */
		min-height: var(--touch);
		padding-inline: var(--space-4);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		line-height: 1.1;
		text-align: center;
		white-space: nowrap;
		transition:
			background-color var(--dur-fast) var(--ease),
			border-color var(--dur-fast) var(--ease),
			color var(--dur-fast) var(--ease),
			opacity var(--dur-fast) var(--ease),
			transform var(--dur-fast) var(--ease);
	}

	.btn:active:not(:disabled):not([aria-disabled='true']) {
		transform: scale(0.98);
	}

	.btn:disabled,
	.btn[aria-disabled='true'] {
		opacity: 0.45;
		cursor: not-allowed;
		pointer-events: none;
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ---- variants -------------------------------------------------------- */

	.v-primary {
		background: var(--brand-ramp);
		color: var(--on-brand);
		box-shadow: var(--shadow-1);
	}

	.v-primary:hover:not(:disabled) {
		filter: saturate(1.08) brightness(1.03);
	}

	.v-secondary {
		background: var(--surface-sunken);
		border-color: var(--line);
		color: var(--ink);
	}

	.v-secondary:hover:not(:disabled) {
		background: var(--surface-hover);
	}

	.v-outline {
		background: transparent;
		border-color: var(--field-line);
		color: var(--ink);
	}

	.v-outline:hover:not(:disabled) {
		background: var(--surface-hover);
	}

	.v-ghost {
		background: transparent;
		color: var(--ink-muted);
	}

	.v-ghost:hover:not(:disabled) {
		background: var(--surface-hover);
		color: var(--ink);
	}

	.v-danger {
		background: var(--danger-solid);
		color: var(--on-danger);
	}

	.v-danger:hover:not(:disabled) {
		filter: brightness(1.08);
	}

	/* ---- sizes ----------------------------------------------------------- */

	.s-sm {
		min-height: var(--touch);
		padding-inline: var(--space-3);
		font-size: var(--text-xs);
	}

	.s-lg {
		min-height: 3.25rem;
		padding-inline: var(--space-5);
		font-size: var(--text-base);
		border-radius: var(--radius-lg);
	}

	.icon-only {
		width: var(--touch);
		min-width: var(--touch);
		padding-inline: 0;
	}

	.icon-only.s-lg {
		width: 3.25rem;
		min-width: 3.25rem;
	}

	.full {
		display: flex;
		width: 100%;
	}

	.spinner {
		width: 1em;
		height: 1em;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 1.4s;
		}
	}
</style>
