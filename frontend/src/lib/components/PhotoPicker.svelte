<script lang="ts">
	import Button from '$ui/Button.svelte';
	import Icon from '$ui/Icon.svelte';
	import { t } from '$lib/i18n';

	/**
	 * Choosing progress photos.
	 *
	 * A plain file input with `accept="image/*"`: on a phone that is what
	 * makes iOS offer Take Photo alongside the photo library. Adding `capture`
	 * would force the camera and take the library away, which is the wrong
	 * trade for a photo you may well have taken this morning.
	 */
	type Props = {
		/** The chosen files. Bound, so the caller uploads them. */
		files?: File[];
		/**
		 * Given instead by a caller whose weigh-in already exists: files are
		 * handed over as they are picked and nothing is held here, so adding a
		 * photo to an old entry takes effect without a save.
		 */
		onpicked?: (picked: File[]) => void | Promise<void>;
		label?: string;
	};

	let { files = $bindable([]), onpicked, label = t.photos.add }: Props = $props();

	let input = $state<HTMLInputElement>();

	/**
	 * Object URLs for the previews, revoked when they stop being shown.
	 * Derived rather than assigned, so the revoking has one owner.
	 */
	let previews = $state<string[]>([]);

	$effect(() => {
		const urls = files.map((file) => URL.createObjectURL(file));
		previews = urls;

		return () => urls.forEach((url) => URL.revokeObjectURL(url));
	});

	async function choose(event: Event) {
		const chosen = (event.target as HTMLInputElement).files;

		if (chosen && chosen.length > 0) {
			const picked = Array.from(chosen);

			if (onpicked) {
				await onpicked(picked);
			} else {
				files = [...files, ...picked];
			}
		}

		// Cleared so picking the same file again still counts as a change,
		// which is otherwise a silent no-op.
		if (input) {
			input.value = '';
		}
	}
</script>

<input
	bind:this={input}
	type="file"
	accept="image/*"
	multiple
	class="sr-only"
	tabindex="-1"
	aria-hidden="true"
	onchange={choose}
/>

<Button variant="outline" icon="camera" full onclick={() => input?.click()}>
	{files.length > 0 ? t.photos.addCount(files.length) : label}
</Button>

{#if previews.length > 0}
	<ul class="previews">
		{#each previews as preview, index (preview)}
			<li>
				<img src={preview} alt="" />
				<button
					type="button"
					class="drop"
					aria-label={t.photos.removeOne(index + 1)}
					onclick={() => (files = files.filter((_, each) => each !== index))}
				>
					<Icon name="close" size={0.9} />
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.previews {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
	}

	li {
		position: relative;
	}

	img {
		aspect-ratio: 1;
		width: 100%;
		object-fit: cover;
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
