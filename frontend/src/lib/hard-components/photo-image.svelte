<script lang="ts">
	import type { ProgressPhoto } from '$lib/types';

	/**
	 * One stored photo, which says so when it cannot be loaded.
	 *
	 * A photo is two things stored separately: a row in the table and a file
	 * on a volume. The file can be missing while the row is still listed --
	 * a backend container recreated without its volume is the way that
	 * happens -- and the request for it then answers 404. A bare `<img>`
	 * renders that as nothing at all, so a screen of photo-shaped boxes comes
	 * up empty with nothing to say why.
	 *
	 * Loaded eagerly, on purpose. `loading="lazy"` is a long-standing way to
	 * get an empty box on iOS Safari: it leaves images that are already in
	 * the viewport unloaded, and nothing asks again until something changes
	 * the layout. That is what blanked the compare screen while the same
	 * photos appeared in the gallery -- a gallery opens on a tap, which is
	 * the layout change, and the compare screen draws its two photos at once
	 * on a page with nothing to scroll. There is nothing to defer anyway: a
	 * screen holds a handful of photos, each already shrunk on the device.
	 */

	export let photo: ProgressPhoto;
	export let alt = '';
	/** Whether the box is big enough to say what happened, or only to be empty. */
	export let explain = false;
	let className = '';
	export { className as class };

	$: src = `/api/progress-photos/${photo.objectId}/file`;

	/**
	 * The source that failed, rather than a `failed` flag the markup resets.
	 *
	 * A `$:` block assigning `failed` would be re-run by the error handler's
	 * own write: Svelte invalidates a reactive statement's dependencies
	 * whenever anything else writes a variable that statement assigns. It
	 * would clear the flag as quickly as the error set it. Deriving instead
	 * means only this statement ever writes `failed`.
	 */
	let failedSrc = '';

	$: failed = failedSrc === src;
</script>

{#if failed}
	<div
		class={`bg-muted text-muted-foreground flex items-center justify-center text-center ${
			explain ? 'min-h-24' : ''
		} ${className}`}
	>
		{#if explain}
			<span class="px-2 text-xs">Photo unavailable</span>
		{/if}
	</div>
{:else}
	<img
		{src}
		{alt}
		width={photo.width || undefined}
		height={photo.height || undefined}
		class={className}
		on:error={() => (failedSrc = src)}
	/>
{/if}
