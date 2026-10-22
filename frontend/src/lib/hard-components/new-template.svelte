<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import TagPicker from './tag-picker.svelte';
	import { createTemplateFrom } from '$lib/templates';
	import type { Tag, Template } from '$lib/types';

	/**
	 * Creating an empty template, with its tags.
	 *
	 * The writing is `createTemplateFrom`, which the same dialog opened from
	 * a workout uses with that workout's exercises -- here there are none
	 * yet, and they are added on the template's own page.
	 */

	/** Every tag the profile has. Bound, so a tag made here is offered later. */
	export let allTags: Tag[] = [];
	/** Called with the created template, tags already applied. */
	export let onCreated: (template: Template) => void | Promise<void>;
	export let label = 'New Template';

	let open = false;
	let name = '';
	let notes = '';
	let tags: Tag[] = [];
	let saving = false;
	let failed = false;

	async function create() {
		const trimmed = name.trim();

		if (!trimmed || saving) {
			return;
		}
		saving = true;
		failed = false;

		try {
			const created: Template = await createTemplateFrom({ name: trimmed, notes, tags });

			await onCreated(created);

			open = false;
			name = '';
			notes = '';
			tags = [];
		} catch (error) {
			console.error(`Failed to create template '${trimmed}': `, error);
			failed = true;
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' }) + ' mt-1 w-full text-gray-400'}>
		<Plus class="mr-2 h-4 w-4" />
		{label}
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{label}</Dialog.Title>
			<Dialog.Description>Exercises are added once it exists.</Dialog.Description>
		</Dialog.Header>
		<label for="name">Name</label>
		<Input
			placeholder="Name"
			bind:value={name}
			on:keydown={(event) => event.key === 'Enter' && create()}
		/>
		<label for="notes">Notes</label>
		<Input placeholder="Notes" bind:value={notes} class="mb-4" />

		<TagPicker bind:allTags bind:selected={tags} />
		{#if failed}
			<p class="text-destructive text-sm">Could not create the template. Try again.</p>
		{/if}
		<br />
		<Dialog.Footer>
			<Button on:click={create} disabled={!name.trim() || saving}>
				{saving ? 'Adding…' : 'Add template'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
