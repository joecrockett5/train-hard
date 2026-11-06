<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import Pager from '$ui/Pager.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import { pageOf } from '$ui/paging';
	import WeightChart from '$lib/components/WeightChart.svelte';
	import WeighInCard from '$lib/components/WeighInCard.svelte';
	import WeighInDialog from '$lib/components/WeighInDialog.svelte';
	import { sortEntries } from '$lib/weight-chart';
	import { comparableWeighIns, widestPair } from '$lib/photo-comparison';
	import { t } from '$lib/i18n';
	import type { BodyWeight, ProgressPhoto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let entries = $state<BodyWeight[]>([]);
	let photos = $state<ProgressPhoto[]>([]);

	$effect(() => {
		entries = data.bodyWeights;
	});
	$effect(() => {
		photos = data.photos;
	});

	let editing = $state<BodyWeight | undefined>(undefined);
	let dialogOpen = $state(false);
	let page = $state(1);

	// One lookup for the list below, rebuilt whenever a photo is added or
	// removed, so a card never has to ask for its own.
	const photosByEntry = $derived(
		photos.reduce((grouped: Map<string, ProgressPhoto[]>, photo) => {
			const forEntry = grouped.get(photo.bodyWeightId) ?? [];
			forEntry.push(photo);
			grouped.set(photo.bodyWeightId, forEntry);
			return grouped;
		}, new Map())
	);

	// Offered only when there are two dates to put side by side, which is what
	// the compare screen needs to show anything at all.
	const comparable = $derived(widestPair(comparableWeighIns(entries, photos)) !== null);

	// The chart reads oldest first; the list below reads newest first. The
	// chart always plots every entry -- only the list is paged.
	const oldestFirst = $derived(sortEntries(entries));
	const newestFirst = $derived(oldestFirst.slice().reverse());
	const visible = $derived(pageOf(newestFirst, page));

	function open(entry?: BodyWeight) {
		editing = entry;
		dialogOpen = true;
	}

	function saved(entry: BodyWeight, uploaded: ProgressPhoto[]) {
		entries = editing
			? entries.map((each) => (each.objectId === entry.objectId ? entry : each))
			: [...entries, entry];
		photos = [...photos, ...uploaded];
	}

	async function remove(entry: BodyWeight) {
		try {
			const response = await fetch(`/api/body-weights/${entry.objectId}`, { method: 'DELETE' });

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			entries = entries.filter((each) => each.objectId !== entry.objectId);
			// The backend deletes their files and rows with the weigh-in.
			photos = photos.filter((photo) => photo.bodyWeightId !== entry.objectId);
		} catch (error) {
			console.error('Could not delete the weigh-in: ', error);
		}
	}

	async function removePhoto(photo: ProgressPhoto) {
		try {
			const response = await fetch(`/api/progress-photos/${photo.objectId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			photos = photos.filter((each) => each.objectId !== photo.objectId);
		} catch (error) {
			console.error('Could not remove the photo: ', error);
		}
	}
</script>

<svelte:head>
	<title>{t.app.name} · {t.bodyWeight.title}</title>
</svelte:head>

<header class="screen-head">
	<div>
		<h1>{t.bodyWeight.title}</h1>
		<p>{t.bodyWeight.subtitle}</p>
	</div>
	<Button variant="primary" icon="plus" onclick={() => open()}>{t.bodyWeight.addWeighIn}</Button>
</header>

<Card>
	<WeightChart entries={oldestFirst} />
</Card>

{#if comparable}
	<Button variant="outline" icon="images" full href="/body-weight/compare">
		{t.bodyWeight.comparePhotos}
	</Button>
{/if}

{#if newestFirst.length > 0}
	<ul>
		{#each visible as entry (entry.objectId)}
			<li>
				<WeighInCard {entry} photos={photosByEntry.get(entry.objectId ?? '') ?? []} onedit={open} />
			</li>
		{/each}
	</ul>
	<Pager count={newestFirst.length} bind:page />
{:else}
	<Card>
		<EmptyState icon="scale" title={t.bodyWeight.none}>
			{#snippet action()}
				<Button variant="outline" icon="plus" onclick={() => open()}>
					{t.bodyWeight.addWeighIn}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{/if}

<WeighInDialog
	bind:open={dialogOpen}
	entry={editing}
	photos={editing ? (photosByEntry.get(editing.objectId ?? '') ?? []) : []}
	onsaved={saved}
	ondelete={remove}
	onphotoremoved={removePhoto}
	onphotosadded={(added) => {
		photos = [...photos, ...added];
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
