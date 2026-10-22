<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import TagPicker from './tag-picker.svelte';
	import type { Tag, Template } from '$lib/types';

	/**
	 * Creating a template, with its tags.
	 *
	 * Built the same way as `NewExercise`, including why the tags are applied
	 * after the create rather than with it: a tag is a join, so it needs an
	 * id to point at.
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
			const response = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: trimmed, description: notes.trim() })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const created: Template = await response.json();

			// One tag that fails leaves the template made and that tag off,
			// which the edit dialog can fix, rather than losing the lot.
			const applied: Tag[] = [];
			for (const tag of tags) {
				const join = await fetch('/api/tag-joins', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ targetId: created.objectId, tagId: tag.objectId })
				});

				if (join.ok) {
					applied.push(tag);
				} else {
					console.error(`Failed to tag '${created.name}' with '${tag.name}'`);
				}
			}

			created.tags = applied;

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
