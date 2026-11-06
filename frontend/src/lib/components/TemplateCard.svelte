<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Icon from '$ui/Icon.svelte';
	import TagBadge from './TagBadge.svelte';
	import type { Template } from '$lib/types';
	import { sortTags } from '$lib/tags';
	import { t } from '$lib/i18n';

	type Props = { template: Template; exerciseCount?: number };

	let { template, exerciseCount }: Props = $props();

	const tags = $derived(sortTags(template.tags ?? []));
	const count = $derived(exerciseCount ?? template.exerciseCount);
</script>

<Card href="/templates/{template.objectId}" padded={false}>
	<div class="inner">
		<div class="text">
			<p class="name">{template.name}</p>
			<p class="meta">
				{#if count !== undefined}{t.templates.exerciseCount(count)}{/if}
			</p>
			{#if template.description}<p class="notes">{template.description}</p>{/if}
			{#if tags.length > 0}
				<div class="tags">
					{#each tags as tag (tag.objectId)}
						<TagBadge {tag} />
					{/each}
				</div>
			{/if}
		</div>
		<Icon name="chevronRight" size={1.1} class="caret" />
	</div>
</Card>

<style>
	.inner {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
		min-height: var(--touch);
	}

	.text {
		flex: 1;
		min-width: 0;
	}

	.name {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.meta {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.notes {
		margin-top: var(--space-1);
		font-size: var(--text-xs);
		color: var(--ink-muted);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-top: var(--space-2);
	}

	.inner :global(.caret) {
		color: var(--ink-subtle);
	}
</style>
