<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n';

	/**
	 * A modal, built on the native `<dialog>`.
	 *
	 * `showModal()` is what makes this worth not hand-rolling: it supplies the
	 * focus trap, Escape, the top layer, and `inert` on everything behind --
	 * four things the old UI's dialog library re-implemented and that are easy
	 * to get subtly wrong.
	 *
	 * `placement="sheet"` is the same element anchored to the bottom of the
	 * screen, which is what a phone wants for anything with a form in it: the
	 * controls land under the thumb rather than behind the keyboard.
	 */
	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		placement?: 'center' | 'sheet';
		/** Hides the header's close button, for a dialog that must be answered. */
		dismissible?: boolean;
		class?: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	};

	let {
		open = $bindable(false),
		title,
		description,
		placement = 'sheet',
		dismissible = true,
		class: className = '',
		children,
		footer,
		onclose
	}: Props = $props();

	let element = $state<HTMLDialogElement>();

	$effect(() => {
		const dialog = element;

		if (!dialog) {
			return;
		}

		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	/**
	 * Background scrolling.
	 *
	 * `showModal` makes the page inert but not unscrollable, and on iOS a
	 * sheet over a long list scrolls the list behind it under a thumb aimed at
	 * the sheet.
	 */
	$effect(() => {
		if (!open) {
			return;
		}

		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previous;
		};
	});

	/**
	 * Focus the first field, not the close button.
	 *
	 * `showModal()` focuses the first focusable element in the dialog, which
	 * here is the dismiss button in the header -- so a sheet whose whole
	 * purpose is a form opened with the caret nowhere near it.
	 */
	$effect(() => {
		if (!open || !element) {
			return;
		}

		const field = element.querySelector<HTMLElement>(
			'.body input:not([type="file"]), .body textarea, .body select'
		);

		field?.focus();
	});

	function dismiss() {
		open = false;
		onclose?.();
	}

	/**
	 * A click that lands on the dialog element itself is a click on the
	 * backdrop -- the content sits in a child, so anything inside it reports
	 * that child as the target.
	 */
	function backdrop(event: MouseEvent) {
		if (dismissible && event.target === element) {
			dismiss();
		}
	}
</script>

<dialog
	bind:this={element}
	class="{placement} {className}"
	aria-label={title}
	onclick={backdrop}
	onclose={dismiss}
	oncancel={(event) => {
		if (!dismissible) {
			event.preventDefault();
		}
	}}
>
	<div class="panel">
		<header>
			<div class="heading">
				<h2>{title}</h2>
				{#if description}<p class="description">{description}</p>{/if}
			</div>
			{#if dismissible}
				<Button
					variant="ghost"
					iconOnly
					icon="close"
					label={t.common.close}
					onclick={dismiss}
					class="dismiss"
				/>
			{/if}
		</header>

		<div class="body">
			{@render children()}
		</div>

		{#if footer}
			<footer>{@render footer()}</footer>
		{/if}
	</div>
</dialog>

<style>
	dialog {
		padding: 0;
		border: none;
		background: transparent;
		color: var(--ink);
		max-width: none;
		max-height: none;
	}

	dialog::backdrop {
		background: var(--scrim);
		backdrop-filter: blur(2px);
	}

	.panel {
		display: flex;
		flex-direction: column;
		background: var(--surface-overlay);
		border: 1px solid var(--line);
		box-shadow: var(--shadow-3);
		overflow: hidden;
	}

	/* ---- sheet: anchored to the bottom, which is where a thumb is -------- */

	dialog.sheet {
		position: fixed;
		inset: auto 0 0 0;
		width: 100%;
		margin: 0;
	}

	dialog.sheet .panel {
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		border-bottom: none;
		max-height: 92svh;
		padding-bottom: env(safe-area-inset-bottom);
	}

	/* Past phone width a sheet stops being the right shape and centres. */
	@media (min-width: 40rem) {
		dialog.sheet {
			inset: 0;
			display: grid;
			place-items: center;
			width: 100%;
			height: 100%;
		}

		dialog.sheet .panel {
			width: min(32rem, calc(100vw - 2 * var(--space-6)));
			max-height: 86svh;
			border-radius: var(--radius-xl);
			border-bottom: 1px solid var(--line);
			padding-bottom: 0;
		}
	}

	/* ---- centred: for confirmations, which are short -------------------- */

	dialog.center {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		margin: 0;
	}

	dialog.center .panel {
		width: min(26rem, calc(100vw - 2 * var(--space-4)));
		max-height: 86svh;
		border-radius: var(--radius-xl);
	}

	header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-5) var(--space-5) var(--space-3);
	}

	.heading {
		flex: 1;
		min-width: 0;
	}

	h2 {
		font-size: var(--text-lg);
	}

	.description {
		margin-top: var(--space-1);
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--leading-snug);
	}

	header :global(.dismiss) {
		margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) 0 0;
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0 var(--space-5) var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	footer {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-5);
		border-top: 1px solid var(--line);
		background: var(--surface-overlay);
	}

	/*
	 * Opening animates; closing does not. A sheet that slides away keeps the
	 * screen busy after the decision has been made, and on a phone that reads
	 * as lag rather than polish.
	 */
	dialog[open] .panel {
		animation: rise var(--dur) var(--ease);
	}

	dialog[open]::backdrop {
		animation: fade var(--dur) var(--ease);
	}

	@keyframes rise {
		from {
			transform: translateY(1.5rem);
			opacity: 0;
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
