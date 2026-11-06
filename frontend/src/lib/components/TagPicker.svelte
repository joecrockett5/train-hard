<script lang="ts">
	import TagBadge from './TagBadge.svelte';
	import Button from '$ui/Button.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import Field from '$ui/Field.svelte';
	import type { Tag } from '$lib/types';
	import { nextTagColour, sortTags, tagNameTaken } from '$lib/tags';
	import { t } from '$lib/i18n';

	/**
	 * Choosing and creating tags.
	 *
	 * Joins are written as they are toggled rather than on save, because
	 * there is nothing to batch them with -- which is also why `selected` is
	 * bound straight to the thing being tagged.
	 */
	type Props = {
		/** Every tag the profile has. Grows when a new one is created here. */
		allTags?: Tag[];
		/** The tags on this item. Bound, so the caller sees toggles. */
		selected?: Tag[];
		/**
		 * What is being tagged. Empty while creating something that does not
		 * exist yet: the picker then only tracks the selection, and the caller
		 * writes the joins once it has an id.
		 */
		targetId?: string;
	};

	let { allTags = $bindable([]), selected = $bindable([]), targetId = '' }: Props = $props();

	let newName = $state('');
	let busy = $state(false);
	let failed = $state(false);

	const selectedIds = $derived(new Set(selected.map((tag) => tag.objectId)));
	const available = $derived(sortTags(allTags));
	const duplicate = $derived(newName.trim().length > 0 && tagNameTaken(allTags, newName));

	async function toggle(tag: Tag) {
		if (busy) {
			return;
		}
		busy = true;

		const wasSelected = selectedIds.has(tag.objectId);

		// Optimistic, then put back if the write fails: a tag that appears to
		// stick and silently did not is worse than a brief flicker.
		selected = wasSelected
			? selected.filter((each) => each.objectId !== tag.objectId)
			: [...selected, tag];

		if (!targetId) {
			busy = false;
			return;
		}

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
			console.error(`Could not ${wasSelected ? 'remove' : 'apply'} tag ${tag.name}: `, error);
			selected = wasSelected
				? [...selected, tag]
				: selected.filter((each) => each.objectId !== tag.objectId);
		} finally {
			busy = false;
		}
	}

	/** Creates a tag and applies it, which is always why it is made here. */
	async function create() {
		const name = newName.trim();

		if (!name || duplicate || busy) {
			return;
		}
		busy = true;
		failed = false;

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
			console.error(`Could not create tag ${name}: `, error);
			failed = true;
			busy = false;
		}
	}
</script>

<div class="picker">
	<p class="heading">{t.tags.title}</p>

	{#if available.length > 0}
		<div class="chips">
			{#each available as tag (tag.objectId)}
				<TagBadge
					{tag}
					interactive
					removable
					muted={!selectedIds.has(tag.objectId)}
					onclick={() => toggle(tag)}
				/>
			{/each}
		</div>
	{:else}
		<p class="hint">{t.tags.none}</p>
	{/if}

	<Field
		id="new-tag"
		label={t.tags.newTag}
		hideLabel
		error={duplicate ? t.tags.duplicate(newName.trim()) : failed ? t.errors.createTag : undefined}
	>
		{#snippet children({ id, describedBy })}
			<div class="create">
				<TextInput
					{id}
					{describedBy}
					bind:value={newName}
					placeholder={t.tags.newTag}
					invalid={duplicate}
					enterkeyhint="done"
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							create();
						}
					}}
				/>
				<Button
					variant="secondary"
					onclick={create}
					disabled={!newName.trim() || duplicate || busy}
				>
					{t.common.add}
				</Button>
			</div>
		{/snippet}
	</Field>
</div>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.heading {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.hint {
		font-size: var(--text-sm);
		color: var(--ink-subtle);
	}

	.create {
		display: flex;
		gap: var(--space-2);
	}
</style>
