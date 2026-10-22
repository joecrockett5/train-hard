<script lang="ts">
	import type { Tag, Template } from '$lib/types';
	import * as Card from '$lib/components/ui/card';
	import { buttonVariants, Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import TagBadge from '$lib/hard-components/tag-badge.svelte';
	import TagPicker from '$lib/hard-components/tag-picker.svelte';
	import ConfirmDelete from '$lib/hard-components/confirm-delete-template.svelte';
	import { sortTags } from '$lib/tags';

	export let template: Template;
	export let href: string = '';
	/** Every tag the profile has, for the picker. Bound, so a new one is kept. */
	export let allTags: Tag[] = [];
	// Only reachable through the edit dialog, which `brief` hides, so callers
	// rendering a brief card legitimately omit it.
	export let deletionCallback: (template: Template) => void = () => {};
	export let brief: boolean = false;
	/** The exercise count, when the caller knows it. Hidden when undefined. */
	export let exerciseCount: number | undefined = undefined;

	let updatedName = template.name;
	let updatedNotes = template.description;

	$: tags = sortTags(template.tags ?? []);

	async function updateTemplate() {
		const response = await fetch(`/api/templates/${template.objectId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				timestamp: template.timestamp,
				objectId: template.objectId,
				name: updatedName,
				description: updatedNotes
			})
		});

		if (!response.ok) {
			console.error('Failed to update template: ', template);
		} else {
			template.name = updatedName;
			template.description = updatedNotes;
		}
	}
</script>

<Card.Root class="mt-4">
	{#if !brief}
		<Dialog.Root>
			<Dialog.Trigger class={`float-right top-4 right-4 ${buttonVariants({ variant: 'ghost' })}`}
				>Edit</Dialog.Trigger
			>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Edit {template.name}</Dialog.Title>
					<Dialog.Description>Edit this template</Dialog.Description>
				</Dialog.Header>
				<label for="name">Name</label>
				<Input placeholder="Name" bind:value={updatedName} />
				<label for="notes">Notes</label>
				<Input placeholder="Notes" bind:value={updatedNotes} class="mb-4" />
				<!--
					Tags are joins, written as they are toggled, so they are
					already saved by the time Save is pressed -- the same as
					on an exercise.
				-->
				<TagPicker bind:allTags bind:selected={template.tags} targetId={template.objectId ?? ''} />
				<br />
				<Dialog.Footer class="flex flex-row gap-2">
					<ConfirmDelete {deletionCallback} {template} />
					<Dialog.Close
						class={buttonVariants({ variant: 'default' }) + ' ml-auto'}
						on:click={updateTemplate}>Save</Dialog.Close
					>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
		<Button variant="ghost" class="float-right top-4 right-4" href="/templates">⤶</Button>
	{/if}
	<Card.Header>
		<Card.Title>
			{#if href}
				<a {href}>{template.name}</a>
			{:else}
				{template.name}
			{/if}
		</Card.Title>
		<Card.Description>
			{#if exerciseCount !== undefined}
				{exerciseCount}
				{exerciseCount === 1 ? 'exercise' : 'exercises'}
			{:else}
				Template
			{/if}
		</Card.Description>
	</Card.Header>
	{#if tags.length > 0 || template.description}
		<Card.Content>
			{#if tags.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each tags as tag (tag.objectId)}
						<TagBadge {tag} />
					{/each}
				</div>
			{/if}
			{#if template.description}
				<p class="text-muted-foreground mt-2 text-sm">{template.description}</p>
			{/if}
		</Card.Content>
	{/if}
</Card.Root>
