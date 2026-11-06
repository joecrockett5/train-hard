<script lang="ts">
	import type { ProgressPhoto } from '$lib/types';
	import { t } from '$lib/i18n';

	/**
	 * One stored photo, which says so when it cannot be loaded.
	 *
	 * A photo is two things stored separately: a row in the table and a file
	 * on a volume. The file can be missing while the row is still listed -- a
	 * backend container recreated without its volume is how that happens --
	 * and the request for it then answers 404. A bare `<img>` renders that as
	 * nothing at all, so a screen of photo-shaped boxes comes up empty with
	 * nothing to say why.
	 *
	 * Loaded eagerly, on purpose. `loading="lazy"` is a long-standing way to
	 * get an empty box on iOS Safari: it leaves images already in the viewport
	 * unloaded, and nothing asks again until something changes the layout.
	 * There is nothing to defer anyway -- a screen holds a handful of photos,
	 * each already shrunk on the device.
	 */
	type Props = {
		photo: ProgressPhoto;
		alt?: string;
		/** Whether the box is big enough to say what happened, or only to be empty. */
		explain?: boolean;
		class?: string;
	};

	let { photo, alt = '', explain = false, class: className = '' }: Props = $props();

	const src = $derived(`/api/progress-photos/${photo.objectId}/file`);

	/**
	 * The source that failed, rather than a flag the markup resets. Derived
	 * state can only be written by one thing, and a flag the error handler
	 * sets would be cleared again by its own re-render.
	 */
	let failedSrc = $state('');
	const failed = $derived(failedSrc === src);
</script>

{#if failed}
	<div class="missing {className}" class:explain>
		{#if explain}<span>{t.errors.photoUnavailable}</span>{/if}
	</div>
{:else}
	<img
		{src}
		{alt}
		width={photo.width || undefined}
		height={photo.height || undefined}
		class={className}
		onerror={() => (failedSrc = src)}
	/>
{/if}

<style>
	.missing {
		display: grid;
		place-items: center;
		background: var(--surface-sunken);
		color: var(--ink-subtle);
		text-align: center;
	}

	.missing.explain {
		min-height: 6rem;
	}

	.missing span {
		padding: var(--space-2);
		font-size: var(--text-xs);
	}
</style>
