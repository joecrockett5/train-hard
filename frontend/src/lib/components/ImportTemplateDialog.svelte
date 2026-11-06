<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import TagFilter from './TagFilter.svelte';
	import TagBadge from './TagBadge.svelte';
	import type { Template } from '$lib/types';
	import { filterByTags, sortTags } from '$lib/tags';
	import { t } from '$lib/i18n';

	/**
	 * Picking a template to pull exercises from.
	 *
	 * Only picks. What that means is the caller's: creating a workout holds
	 * the choice until the workout exists, while a workout already open adds
	 * the exercises straight away.
	 */
	type Props = {
		templates: Template[];
		onpick: (template: Template) => void | Promise<void>;
		label?: string;
		description?: string;
	};

	let {
		templates,
		onpick,
		label = t.templates.importLabel,
		description = t.templates.importHelp
	}: Props = $props();

	let open = $state(false);
	let selectedTagIds = $state<string[]>([]);

	const filterableTags = $derived([
		...new Map(
			templates.flatMap((template) => template.tags ?? []).map((tag) => [tag.objectId, tag])
		).values()
	]);

	const matching = $derived(filterByTags(templates, selectedTagIds));

	async function pick(template: Template) {
		open = false;
		await onpick(template);
	}
</script>

<Button variant="outline" icon="download" onclick={() => (open = true)}>{label}</Button>

<Dialog bind:open title={label} {description}>
	{#if templates.length === 0}
		<EmptyState icon="bookmark" title={t.templates.importNone} />
	{:else}
		<TagFilter tags={filterableTags} bind:selected={selectedTagIds} />

		{#if matching.length === 0}
			<EmptyState icon="search" title={t.templates.none} />
		{:else}
			<ul>
				{#each matching as template (template.objectId)}
					<li>
						<button type="button" onclick={() => pick(template)}>
							<span class="name">{template.name}</span>
							{#if template.exerciseCount !== undefined}
								<span class="count">{t.templates.exerciseCount(template.exerciseCount)}</span>
							{/if}
							{#if template.description}
								<span class="notes">{template.description}</span>
							{/if}
							{#if (template.tags ?? []).length > 0}
								<span class="tags">
									{#each sortTags(template.tags ?? []) as tag (tag.objectId)}
										<TagBadge {tag} />
									{/each}
								</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</Dialog>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	button {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-1) var(--space-2);
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--line);
		border-radius: var(--radius-md);
		text-align: left;
		transition: border-color var(--dur-fast) var(--ease);
	}

	button:hover {
		border-color: var(--brand);
	}

	.name {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.count {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.notes,
	.tags {
		grid-column: 1 / -1;
	}

	.notes {
		font-size: var(--text-xs);
		color: var(--ink-muted);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-top: var(--space-1);
	}
</style>
