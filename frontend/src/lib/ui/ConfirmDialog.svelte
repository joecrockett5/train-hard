<script lang="ts">
	import Dialog from './Dialog.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n';

	/**
	 * The one confirmation. Every destructive action in the app goes through
	 * it, so "are you sure" is phrased, placed and ordered the same way each
	 * time -- cancel on the left, the destructive verb on the right, and the
	 * thing being destroyed named in the title.
	 */
	type Props = {
		open?: boolean;
		title: string;
		body?: string;
		/** The destructive verb. "Delete" unless something else is truer. */
		confirmLabel?: string;
		busy?: boolean;
		onconfirm: () => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		title,
		body,
		confirmLabel = t.common.delete,
		busy = false,
		onconfirm
	}: Props = $props();

	let working = $state(false);

	async function confirm() {
		working = true;

		try {
			await onconfirm();
			open = false;
		} finally {
			working = false;
		}
	}
</script>

<Dialog bind:open {title} placement="center" description={body ?? t.confirm.irreversible}>
	{#if body}
		<p class="note">{t.confirm.irreversible}</p>
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>{t.common.cancel}</Button>
		<Button variant="danger" class="confirm" busy={busy || working} onclick={confirm}>
			{confirmLabel}
		</Button>
	{/snippet}
</Dialog>

<style>
	.note {
		color: var(--ink-muted);
		font-size: var(--text-sm);
	}

	:global(dialog.center footer .confirm) {
		margin-left: auto;
	}
</style>
