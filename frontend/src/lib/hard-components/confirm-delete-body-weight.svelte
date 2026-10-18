<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import BodyWeightEntry from './body-weight-entry.svelte';
	import { type BodyWeight } from '$lib/types';

	export let entry: BodyWeight;
	export let deletionCallback;
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' }) + 'm-4'}>Delete</Dialog.Trigger>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Are you sure you want to delete this weigh-in?</Dialog.Title>
			<Dialog.Description>This cannot be undone.</Dialog.Description>
		</Dialog.Header>
		<BodyWeightEntry {entry} brief={true} />
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'ghost' })}>Cancel</Dialog.Close>
			<Dialog.Close
				class={buttonVariants({ variant: 'destructive' })}
				on:click={() => deletionCallback(entry)}>Delete</Dialog.Close
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
