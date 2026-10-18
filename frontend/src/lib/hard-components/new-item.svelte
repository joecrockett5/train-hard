<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Plus } from 'lucide-svelte';

	export let item: string = 'Item';
	export let description: string = '';
	export let className: string = '';
	/** Bindable, for a caller that needs to close this once its work is done. */
	export let open: boolean = false;
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' }) + ' w-full text-gray-400 mt-1'}>
		<Plus />
		New {item}
	</Dialog.Trigger>
	<Dialog.Content class={className + ' w-3/4 max-w-lg'}>
		<Dialog.Header>
			<Dialog.Title>New {item}</Dialog.Title>
			<Dialog.Description>
				{description}
			</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4" />

		<slot />
	</Dialog.Content>
</Dialog.Root>
