<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import PhotoImage from '$lib/hard-components/photo-image.svelte';
	import type { ProgressPhoto } from '$lib/types';

	/**
	 * The photos on one weigh-in, folded away until asked for.
	 *
	 * Collapsed by default because the weights screen is a list of readings
	 * and a chart: a column of photographs between every row would bury the
	 * numbers, and on a phone it would be most of the scrolling.
	 */

	export let photos: ProgressPhoto[] = [];
	/** Offered only when the caller passes one, so the card stays read-only. */
	export let removalCallback: ((photo: ProgressPhoto) => void) | undefined = undefined;

	let open = false;
	let viewing: ProgressPhoto | null = null;
</script>

{#if photos.length > 0}
	<Button
		variant="ghost"
		size="sm"
		class="text-muted-foreground -ml-2 h-8 px-2"
		aria-expanded={open}
		on:click={() => (open = !open)}
	>
		<ChevronRight class={`mr-1 h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
		{photos.length}
		{photos.length === 1 ? 'photo' : 'photos'}
	</Button>

	{#if open}
		<div class="mt-2 grid grid-cols-3 gap-2">
			{#each photos as photo (photo.objectId)}
				<div class="relative">
					<button
						type="button"
						class="w-full"
						aria-label="View photo full size"
						on:click={() => (viewing = photo)}
					>
						<PhotoImage {photo} class="aspect-square w-full rounded-md object-cover" />
					</button>
					{#if removalCallback}
						<button
							type="button"
							class="bg-background/80 absolute top-1 right-1 rounded-full px-2 py-1 text-xs"
							on:click={() => removalCallback?.(photo)}
						>
							Remove
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
{/if}

<Dialog.Root
	open={viewing !== null}
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			viewing = null;
		}
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Progress photo</Dialog.Title>
		</Dialog.Header>
		{#if viewing}
			<PhotoImage photo={viewing} explain class="max-h-[70vh] w-full rounded-md object-contain" />
		{/if}
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'ghost' })}>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
