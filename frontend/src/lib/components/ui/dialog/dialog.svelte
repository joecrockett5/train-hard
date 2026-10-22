<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type $$Props = DialogPrimitive.Props;

	/**
	 * Where the dialog's markup is moved to when it opens.
	 *
	 * `body`, rather than the default of "the closest portal above me".
	 * That default keeps a nested overlay inside its parent's portal, which
	 * is what you want for a popover belonging to a dialog and not for a
	 * dialog of its own: it inherits the parent's `overflow-y-auto`, so it is
	 * clipped to the parent's height, and the parent's transform, which makes
	 * the parent rather than the viewport the containing block its `fixed`
	 * positioning resolves against.
	 *
	 * So a dialog opened from inside another came out the size of the one
	 * behind it -- the create-exercise dialog cut down to the height of the
	 * exercise picker, which is at its shortest when nothing is typed and the
	 * list is empty. Every dialog here is a top-level overlay, so every one
	 * belongs on the body.
	 */
	export let portal: $$Props['portal'] = 'body';
	export let open: $$Props['open'] = undefined;
</script>

<DialogPrimitive.Root {portal} bind:open {...$$restProps}>
	<slot />
</DialogPrimitive.Root>
