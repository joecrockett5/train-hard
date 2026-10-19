<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import X from 'lucide-svelte/icons/x';
	import * as Dialog from './index.js';
	import { cn, flyAndScale } from '$lib/utils.js';

	type $$Props = DialogPrimitive.ContentProps;

	let className: $$Props['class'] = undefined;
	export let transition: $$Props['transition'] = flyAndScale;
	export let transitionConfig: $$Props['transitionConfig'] = {
		duration: 200
	};
	export { className as class };
</script>

<Dialog.Portal>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		{transition}
		{transitionConfig}
		class={cn(
			/*
				90vw, not a percentage: a percentage width resolves against the
				containing block, which for a fixed element is the viewport
				only while no ancestor has a transform -- and the sheet and the
				dialog's own entry animation both set one. Viewport units are
				the same 90% of the screen wherever the dialog is opened from.

				Height is the content's, capped at 85vh and scrolling past
				that, rather than a fixed fraction -- a picker showing one
				result should not be the same height as one showing eight.
			*/
			'bg-background fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border p-6 shadow-lg sm:rounded-lg',
			className
		)}
		{...$$restProps}
	>
		<slot />
		<DialogPrimitive.Close
			class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none"
		>
			<X class="h-4 w-4" />
			<span class="sr-only">Close</span>
		</DialogPrimitive.Close>
	</DialogPrimitive.Content>
</Dialog.Portal>
