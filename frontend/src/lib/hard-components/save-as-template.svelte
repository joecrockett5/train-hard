<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import Save from 'lucide-svelte/icons/bookmark';
	import TagPicker from './tag-picker.svelte';
	import { createTemplateFrom } from '$lib/templates';
	import type { Exercise, Tag, Template } from '$lib/types';

	/**
	 * Turning the workout you are looking at into a template.
	 *
	 * The other half of importing one: a list worth repeating is usually one
	 * you have just finished rather than one you sat down to write, so this
	 * takes the exercises as they are and asks only for the naming.
	 *
	 * No check for whether this workout came from a template already.
	 * Nothing records that it did, and a workout that has drifted from the
	 * template it started as is exactly when saving it back is wanted.
	 */

	/** The exercises to put in it, in the order the workout shows them. */
	export let exercises: Exercise[] = [];
	/** Every tag the profile has. Bound, so a tag made here is offered later. */
	export let allTags: Tag[] = [];
	/** What to call it by default -- the workout's own title. */
	export let defaultName = '';

	let open = false;
	let name = defaultName;
	let notes = '';
	let tags: Tag[] = [];
	let saving = false;
	let failed = false;
	/** The template once it exists, so the dialog can offer a way to it. */
	let saved: Template | null = null;

	// The dialog is rebuilt each time it opens, but this component is not, so
	// a second save would otherwise start from the first one's leftovers.
	$: if (open) {
		failed = false;
	}

	async function save() {
		const trimmed = name.trim();

		if (!trimmed || saving) {
			return;
		}
		saving = true;
		failed = false;

		try {
			saved = await createTemplateFrom({ name: trimmed, notes, tags }, exercises);
			notes = '';
			tags = [];
		} catch (error) {
			console.error(`Failed to save '${trimmed}' as a template: `, error);
			failed = true;
		} finally {
			saving = false;
		}
	}

	/** Closes and goes back to a blank slate, ready for another save. */
	function done() {
		open = false;
		saved = null;
		name = defaultName;
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && done()}>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' }) + ' mt-1 w-full text-gray-400'}>
		<Save class="mr-2 h-4 w-4" />
		Save as template
	</Dialog.Trigger>
	<Dialog.Content>
		{#if saved}
			<Dialog.Header>
				<Dialog.Title>Saved {saved.name}</Dialog.Title>
				<Dialog.Description>
					{saved.exerciseCount}
					{saved.exerciseCount === 1 ? 'exercise' : 'exercises'} from this workout.
				</Dialog.Description>
			</Dialog.Header>
			<!--
				Stays on the workout rather than following the new template:
				this is reachable mid-session, and being taken out of a
				workout you are still logging is worse than a second tap for
				the rarer case of wanting to tidy the template now.
			-->
			<Dialog.Footer class="flex flex-row gap-2">
				<Button variant="ghost" on:click={done}>Stay here</Button>
				<Button
					href={`/templates/${saved.objectId}`}
					class="ml-auto"
					on:click={() => {
						open = false;
					}}
				>
					Open template
				</Button>
			</Dialog.Footer>
		{:else}
			<Dialog.Header>
				<Dialog.Title>Save as template</Dialog.Title>
				<Dialog.Description>
					{#if exercises.length === 0}
						This workout has no exercises yet.
					{:else}
						Its {exercises.length}
						{exercises.length === 1 ? 'exercise' : 'exercises'} are kept. Sets are not.
					{/if}
				</Dialog.Description>
			</Dialog.Header>
			<label for="name">Name</label>
			<Input
				placeholder="Name"
				bind:value={name}
				on:keydown={(event) => event.key === 'Enter' && save()}
			/>
			<label for="notes">Notes</label>
			<Input placeholder="Notes" bind:value={notes} class="mb-4" />

			<TagPicker bind:allTags bind:selected={tags} />
			{#if failed}
				<p class="text-destructive text-sm">Could not save the template. Try again.</p>
			{/if}
			<br />
			<Dialog.Footer>
				<Button on:click={save} disabled={!name.trim() || exercises.length === 0 || saving}>
					{saving ? 'Saving…' : 'Save template'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
