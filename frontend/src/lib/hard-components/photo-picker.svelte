<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Camera from 'lucide-svelte/icons/camera';
	import X from 'lucide-svelte/icons/x';

	/**
	 * Choosing progress photos to go with a weigh-in.
	 *
	 * A plain file input with `accept="image/*"`: on a phone that is what
	 * makes iOS offer Take Photo alongside the photo library. Adding
	 * `capture` would force the camera and take the library away, which is
	 * the wrong trade for a photo you may well have taken this morning.
	 *
	 * Holds the files only. Uploading waits for the weigh-in to exist, since
	 * a photo has nothing to belong to until it does.
	 */

	/** The chosen files. Bound, so the caller uploads them. */
	export let files: File[] = [];
	/**
	 * Given instead by a caller whose weigh-in already exists: the files are
	 * handed over as they are picked and nothing is held here, so adding a
	 * photo to an old entry takes effect without a save.
	 */
	export let onPicked: ((picked: File[]) => void | Promise<void>) | undefined = undefined;
	export let label = 'Add photos';

	let input: HTMLInputElement;
	/** Object URLs for the previews, revoked when they stop being shown. */
	let previews: string[] = [];

	$: {
		for (const url of previews) {
			URL.revokeObjectURL(url);
		}
		previews = files.map((file) => URL.createObjectURL(file));
	}

	onDestroy(() => {
		for (const url of previews) {
			URL.revokeObjectURL(url);
		}
	});

	async function choose(event: Event) {
		const chosen = (event.target as HTMLInputElement).files;

		if (chosen && chosen.length > 0) {
			const picked = Array.from(chosen);

			if (onPicked) {
				await onPicked(picked);
			} else {
				files = [...files, ...picked];
			}
		}

		// Cleared so that picking the same file again still counts as a
		// change, which is otherwise a silent no-op.
		input.value = '';
	}

	function remove(index: number) {
		files = files.filter((_, each) => each !== index);
	}
</script>

<input
	bind:this={input}
	type="file"
	accept="image/*"
	multiple
	class="hidden"
	on:change={choose}
	aria-hidden="true"
	tabindex="-1"
/>

<Button
	type="button"
	variant="outline"
	class={buttonVariants({ variant: 'outline' }) + ' mt-1 w-full text-gray-400'}
	on:click={() => input.click()}
>
	<Camera class="mr-2 h-4 w-4" />
	{label}{files.length > 0 ? ` (${files.length})` : ''}
</Button>

{#if previews.length > 0}
	<div class="mt-2 grid grid-cols-3 gap-2">
		{#each previews as preview, index (preview)}
			<div class="relative">
				<img src={preview} alt="" class="aspect-square w-full rounded-md object-cover" />
				<button
					type="button"
					class="bg-background/80 absolute top-1 right-1 rounded-full p-1"
					aria-label={`Remove photo ${index + 1}`}
					on:click={() => remove(index)}
				>
					<X class="h-3 w-3" />
				</button>
			</div>
		{/each}
	</div>
{/if}
