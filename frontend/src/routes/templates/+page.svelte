<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import Pager from '$ui/Pager.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import { pageOf } from '$ui/paging';
	import TemplateCard from '$lib/components/TemplateCard.svelte';
	import TemplateDialog from '$lib/components/TemplateDialog.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';
	import { filterByTags } from '$lib/tags';
	import { t } from '$lib/i18n';
	import type { Tag, Template } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let templates = $state<Template[]>([]);
	let allTags = $state<Tag[]>([]);

	$effect(() => {
		// Newest first, as the exercises screen does it.
		templates = data.templates
			.slice()
			.sort((a: Template, b: Template) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
	});

	$effect(() => {
		allTags = data.tags;
	});

	let selectedTagIds = $state<string[]>([]);
	let page = $state(1);
	let creating = $state(false);

	const matching = $derived(filterByTags(templates, selectedTagIds));
	const visible = $derived(pageOf(matching, page));
</script>

<svelte:head>
	<title>{t.app.name} · {t.templates.title}</title>
</svelte:head>

<header class="screen-head">
	<div>
		<h1>{t.templates.title}</h1>
		<p>
			{selectedTagIds.length > 0
				? t.templates.matching(matching.length, templates.length)
				: t.templates.subtitle}
		</p>
	</div>
	<Button variant="primary" icon="plus" onclick={() => (creating = true)}>
		{t.templates.newTemplate}
	</Button>
</header>

{#if allTags.length > 0}
	<Card>
		<TagFilter tags={allTags} bind:selected={selectedTagIds} onchange={() => (page = 1)} />
	</Card>
{/if}

{#if matching.length > 0}
	<ul>
		{#each visible as template (template.objectId)}
			<li><TemplateCard {template} /></li>
		{/each}
	</ul>
	<Pager count={matching.length} bind:page />
{:else}
	<Card>
		<EmptyState
			icon="bookmark"
			title={selectedTagIds.length > 0 ? t.templates.none : t.templates.noneAtAll}
		>
			{#snippet action()}
				<Button variant="outline" icon="plus" onclick={() => (creating = true)}>
					{t.templates.newTemplate}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{/if}

<TemplateDialog
	bind:open={creating}
	bind:allTags
	onsaved={(template) => {
		// The create response carries no count, and a template made here has
		// none yet -- without this the new card reads differently from the
		// same card after a reload.
		templates = [{ ...template, exerciseCount: template.exerciseCount ?? 0 }, ...templates];
	}}
/>

<style>
	.screen-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	h1 {
		font-size: var(--text-xl);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.screen-head p {
		font-size: var(--text-sm);
		color: var(--ink-subtle);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
</style>
