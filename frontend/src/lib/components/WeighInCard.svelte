<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import PhotoGallery from './PhotoGallery.svelte';
	import type { BodyWeight, ProgressPhoto } from '$lib/types';
	import { formatWeight, toDisplayWeight } from '$lib/units';
	import { preferences } from '$lib/preferences.svelte';
	import { longDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';

	type Props = {
		entry: BodyWeight;
		photos?: ProgressPhoto[];
		onedit: (entry: BodyWeight) => void;
	};

	let { entry, photos = [], onedit }: Props = $props();

	const prefs = preferences();
</script>

<Card padded={false}>
	<div class="inner">
		<div class="text">
			<p class="weight tnum">
				{formatWeight(toDisplayWeight(entry.weight, prefs.weightUnit))}{prefs.weightUnit}
			</p>
			<p class="date">{longDate(entry.entryDate)}</p>
			{#if entry.notes}<p class="notes">{entry.notes}</p>{/if}
			{#if photos.length > 0}
				<PhotoGallery {photos} />
			{/if}
		</div>
		<Button
			variant="ghost"
			size="sm"
			iconOnly
			icon="pencil"
			label={t.bodyWeight.editWeighIn}
			onclick={() => onedit(entry)}
		/>
	</div>
</Card>

<style>
	.inner {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
	}

	.text {
		flex: 1;
		min-width: 0;
	}

	.weight {
		font-size: var(--text-lg);
		font-weight: 700;
		line-height: var(--leading-tight);
	}

	.date {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.notes {
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}
</style>
