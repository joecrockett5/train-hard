<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import Icon from '$ui/Icon.svelte';
	import PhotoImage from './PhotoImage.svelte';
	import type { ProgressPhoto } from '$lib/types';
	import { t } from '$lib/i18n';

	/**
	 * The photos on one weigh-in, folded away until asked for.
	 *
	 * Collapsed by default because the weight screen is a list of readings and
	 * a chart: a column of photographs between every row would bury the
	 * numbers, and on a phone it would be most of the scrolling.
	 */
	type Props = {
		photos: ProgressPhoto[];
		/** Offered only when the caller passes one, so a card stays read-only. */
		onremove?: (photo: ProgressPhoto) => void | Promise<void>;
	};

	let { photos, onremove }: Props = $props();

	let open = $state(false);
	let viewing = $state<ProgressPhoto | null>(null);
	let removing = $state<ProgressPhoto | null>(null);
</script>

{#if photos.length > 0}
	<div class="gallery">
		<Button
			variant="ghost"
			size="sm"
			onclick={() => (open = !open)}
			aria-expanded={open}
			class="disclose"
		>
			<Icon name="chevronRight" size={1} class={open ? 'turned' : ''} />
			{t.photos.count(photos.length)}
		</Button>

		{#if open}
			<ul>
				{#each photos as photo (photo.objectId)}
					<li>
						<button type="button" aria-label={t.photos.view} onclick={() => (viewing = photo)}>
							<PhotoImage {photo} class="thumb" />
						</button>
						{#if onremove}
							<button
								type="button"
								class="drop"
								aria-label={t.common.remove}
								onclick={() => (removing = photo)}
							>
								<Icon name="close" size={0.9} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<Dialog
	open={viewing !== null}
	title={t.photos.viewTitle}
	placement="center"
	onclose={() => (viewing = null)}
>
	{#if viewing}
		<PhotoImage photo={viewing} explain class="full" />
	{/if}
</Dialog>

{#if removing}
	<ConfirmDialog
		open={true}
		title={t.confirm.removePhoto}
		confirmLabel={t.common.remove}
		onconfirm={async () => {
			const photo = removing;
			removing = null;
			if (photo) {
				await onremove?.(photo);
			}
		}}
	/>
{/if}

<style>
	.gallery {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		align-items: flex-start;
	}

	.gallery :global(.disclose) {
		margin-left: calc(-1 * var(--space-3));
	}

	.gallery :global(.turned) {
		transform: rotate(90deg);
		transition: transform var(--dur-fast) var(--ease);
	}

	ul {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
		width: 100%;
	}

	li {
		position: relative;
	}

	li > button:first-child {
		display: block;
		width: 100%;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	:global(.thumb) {
		aspect-ratio: 1;
		width: 100%;
		object-fit: cover;
	}

	:global(.full) {
		width: 100%;
		max-height: 70svh;
		object-fit: contain;
		border-radius: var(--radius-md);
	}

	.drop {
		position: absolute;
		top: var(--space-1);
		right: var(--space-1);
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--surface-overlay) 86%, transparent);
		backdrop-filter: blur(4px);
		color: var(--ink);
		box-shadow: var(--shadow-1);
	}
</style>
