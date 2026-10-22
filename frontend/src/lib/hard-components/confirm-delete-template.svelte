<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import TemplateInfo from '$lib/hard-components/template-info.svelte';
	import { type Template } from '$lib/types';

	export let template: Template;
	export let deletionCallback;
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' }) + 'm-4'}>Delete</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure you want to delete this template?</Dialog.Title>
			<Dialog.Description>
				This cannot be undone. Workouts already made from it are not touched.
			</Dialog.Description>
		</Dialog.Header>
		<TemplateInfo {template} brief={true} />
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'ghost' })}>Cancel</Dialog.Close>
			<Dialog.Close
				class={buttonVariants({ variant: 'destructive' })}
				on:click={() => deletionCallback(template)}>Delete</Dialog.Close
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
