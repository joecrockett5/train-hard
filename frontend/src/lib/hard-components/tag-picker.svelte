<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import { Button } from '$lib/components/ui/button';
	import TagBadge from './tag-badge.svelte';
	import type { Tag } from '$lib/types';
	import { nextTagColour, sortTags, tagNameTaken } from '$lib/tags';

	/** Every tag the profile has. Grows when a new one is created here. */
	export let allTags: Tag[] = [];
	/** The tags on this exercise. Bound, so the caller sees toggles. */
	export let selected: Tag[] = [];
	/** What is being tagged. */
	export let targetId: string;

	let newName = '';
	let busy = false;

	$: selectedIds = new Set(selected.map((tag) => tag.objectId));
	$: available = sortTags(allTags);
	$: duplicate = newName.trim().length > 0 && tagNameTaken(allTags, newName);

	async function toggle(tag: Tag) {
		if (busy) {
			return;
		}
		busy = true;

		const wasSelected = selectedIds.has(tag.objectId);

		// Optimistic, then put back if the write fails -- the same approach as
		// the theme toggle, for the same reason: a tag that appears to stick
		// and silently did not is worse than a brief flicker.
		selected = wasSelected
			? selected.filter((t) => t.objectId !== tag.objectId)
			: [...selected, tag];

		try {
			const response = wasSelected
				? await fetch(`/api/tag-joins?targetId=${targetId}&tagId=${tag.objectId}`, {
						method: 'DELETE'
					})
				: await fetch('/api/tag-joins', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ targetId, tagId: tag.objectId })
					});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
		} catch (error) {
			console.error(`Failed to ${wasSelected ? 'remove' : 'apply'} tag ${tag.name}: `, error);
			selected = wasSelected
				? [...selected, tag]
				: selected.filter((t) => t.objectId !== tag.objectId);
		} finally {
			busy = false;
		}
	}

	/** Creates a tag and applies it straight away, which is always why it is made here. */
	async function createTag() {
		const name = newName.trim();

		if (!name || duplicate || busy) {
			return;
		}
		busy = true;

		try {
			const response = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, colorHex: nextTagColour(allTags) })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const created: Tag = await response.json();
			allTags = [...allTags, created];
			newName = '';

			busy = false;
			await toggle(created);
		} catch (error) {
			console.error(`Failed to create tag ${name}: `, error);
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-sm font-semibold">Tags</span>

	{#if available.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each available as tag (tag.objectId)}
				<TagBadge
					{tag}
					interactive
					removable
					muted={!selectedIds.has(tag.objectId)}
					on:click={() => toggle(tag)}
				/>
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground text-sm">No tags yet. Make the first one below.</p>
	{/if}

	<div class="flex gap-2">
		<Input
			placeholder="New tag"
			bind:value={newName}
			on:keydown={(event) => event.key === 'Enter' && createTag()}
		/>
		<Button
			type="button"
			variant="secondary"
			on:click={createTag}
			disabled={!newName.trim() || duplicate || busy}
		>
			Add
		</Button>
	</div>
	{#if duplicate}
		<p class="text-muted-foreground text-xs">“{newName.trim()}” already exists.</p>
	{/if}
</div>
