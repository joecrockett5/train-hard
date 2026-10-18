<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import TagPicker from './tag-picker.svelte';
	import type { Exercise, Tag } from '$lib/types';

	/**
	 * Creating an exercise, with its tags, from anywhere.
	 *
	 * Lives in one place because it happens in two: the exercises page, and
	 * the picker on a workout, where the exercise is created and added to the
	 * workout in one go. `onCreated` is what differs between them.
	 */

	/** Every tag the profile has. Bound, so a tag made here is offered later. */
	export let allTags: Tag[] = [];
	/** Called with the created exercise, tags already applied. */
	export let onCreated: (exercise: Exercise) => void | Promise<void>;
	export let label = 'New Exercise';

	let open = false;
	let name = '';
	let description = '';
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
			const response = await fetch('/api/exercises', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: trimmed, description: description.trim() })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const created: Exercise = await response.json();

			// Tags are joins, so they can only be written once the exercise
			// has an id -- the picker above only collected the choice. One
			// that fails leaves the exercise made and that tag off, which the
			// edit dialog can fix, rather than losing the lot.
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
			description = '';
			tags = [];
		} catch (error) {
			console.error(`Failed to create exercise '${trimmed}': `, error);
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
	<Dialog.Content class="w-3/4 max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{label}</Dialog.Title>
		</Dialog.Header>
		<label for="name">Name</label>
		<Input
			placeholder="Name"
			bind:value={name}
			on:keydown={(event) => event.key === 'Enter' && create()}
		/>
		<label for="description">Description</label>
		<Input placeholder="Description" bind:value={description} class="mb-4" />
		<TagPicker bind:allTags bind:selected={tags} />
		{#if failed}
			<p class="text-destructive text-sm">Could not create the exercise. Try again.</p>
		{/if}
		<br />
		<Dialog.Footer>
			<!-- "Add exercise", not "Add": the tag picker above has its own. -->
			<Button on:click={create} disabled={!name.trim() || saving}>
				{saving ? 'Adding…' : 'Add exercise'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
