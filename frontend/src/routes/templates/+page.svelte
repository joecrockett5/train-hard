<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import TemplateInfo from '$lib/hard-components/template-info.svelte';
	import NewTemplate from '$lib/hard-components/new-template.svelte';
	import Pager, { PAGE_SIZE } from '$lib/hard-components/pager.svelte';
	import TagFilter from '$lib/hard-components/tag-filter.svelte';
	import { filterByTags } from '$lib/tags';
	import { type Tag, type Template } from '$lib/types';

	export let data;

	let page = 1;

	// Newest first, as the exercises page does it: the one you just made is
	// the one you are looking for.
	let templates: Template[] = data.templates.sort(
		(a: Template, b: Template) =>
			new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
	);
	let allTags: Tag[] = data.tags;
	let selectedTagIds: string[] = [];

	$: matching = filterByTags(templates, selectedTagIds);

	// Page 1 is the only page certain to exist after the filter narrows the
	// list; staying on page 4 of 4 would otherwise show nothing.
	$: if (selectedTagIds) {
		page = 1;
	}

	$: viewableTemplates = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
</script>

<svelte:head>
	<title>hard: Templates</title>
</svelte:head>

<Card.Root class="mt-4">
	<Card.Header>
		<Card.Title>Templates</Card.Title>
		<Card.Description>
			{#if selectedTagIds.length > 0}
				{matching.length} of {templates.length} templates
			{:else}
				Start a workout from a list you have already made
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content class="pt-0">
		<TagFilter tags={allTags} bind:selected={selectedTagIds} />
	</Card.Content>
</Card.Root>

<NewTemplate
	bind:allTags
	onCreated={(template) => {
		// The create response carries no count, and a template made here has
		// no exercises yet -- without this the new card reads differently
		// from the same card after a reload.
		templates = [{ ...template, exerciseCount: 0 }, ...templates];
	}}
/>

<Pager count={matching.length} bind:page />

{#each viewableTemplates as template (template.objectId)}
	<TemplateInfo
		{template}
		brief
		href={`/templates/${template.objectId}`}
		exerciseCount={template.exerciseCount}
	/>
{/each}

{#if matching.length === 0}
	<p class="text-muted-foreground mt-8 text-center text-sm">No templates match.</p>
{/if}

<div class="mb-8" />

<Pager count={matching.length} bind:page />
