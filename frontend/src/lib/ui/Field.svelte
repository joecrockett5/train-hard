<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A labelled control.
	 *
	 * Every input in the app is wrapped in one, which is how the label gets to
	 * be a real `<label for>` rather than the floating `<label for="name">`
	 * pointing at nothing that the old UI had on most of its forms.
	 */
	type Props = {
		id: string;
		label: string;
		help?: string;
		error?: string;
		/** Hides the label visually; it still names the control. */
		hideLabel?: boolean;
		class?: string;
		children: Snippet<[{ id: string; describedBy: string | undefined }]>;
	};

	let {
		id,
		label,
		help,
		error,
		hideLabel = false,
		class: className = '',
		children
	}: Props = $props();

	const helpId = $derived(help ? `${id}-help` : undefined);
	const errorId = $derived(error ? `${id}-error` : undefined);
	const describedBy = $derived([errorId, helpId].filter(Boolean).join(' ') || undefined);
</script>

<div class="field {className}">
	<label for={id} class={hideLabel ? 'sr-only' : 'label'}>{label}</label>
	{@render children({ id, describedBy })}
	{#if error}
		<p class="error" id={errorId} role="alert">{error}</p>
	{:else if help}
		<p class="help" id={helpId}>{help}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}

	.label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink);
	}

	.help {
		font-size: var(--text-xs);
		line-height: var(--leading-snug);
		color: var(--ink-subtle);
	}

	.error {
		font-size: var(--text-xs);
		line-height: var(--leading-snug);
		color: var(--danger);
	}
</style>
