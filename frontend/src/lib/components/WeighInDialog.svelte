<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import PhotoPicker from './PhotoPicker.svelte';
	import PhotoGallery from './PhotoGallery.svelte';
	import type { BodyWeight, ProgressPhoto } from '$lib/types';
	import { formatWeight, toDisplayWeight, toStoredWeight } from '$lib/units';
	import { preferences } from '$lib/preferences.svelte';
	import { uploadPhotos } from '$lib/photos';
	import { todayIso } from '$lib/dates';
	import { longDate } from '$lib/i18n/format';
	import { t } from '$lib/i18n';

	/**
	 * Logging or editing a weigh-in.
	 *
	 * The reading is typed in whatever unit the profile is showing and stored
	 * in kilograms. A weigh-in carries no unit of its own: a set does, because
	 * a gym's plates may be imperial, but a bathroom scale is whatever its
	 * owner set it to once, and a unit per weigh-in would only create the
	 * possibility of a graph comparing two of them.
	 */
	type Props = {
		open?: boolean;
		/** Absent when logging a new one. */
		entry?: BodyWeight;
		/** This weigh-in's photos, when editing. */
		photos?: ProgressPhoto[];
		onsaved: (entry: BodyWeight, photos: ProgressPhoto[]) => void | Promise<void>;
		ondelete?: (entry: BodyWeight) => void | Promise<void>;
		onphotoremoved?: (photo: ProgressPhoto) => void | Promise<void>;
		onphotosadded?: (photos: ProgressPhoto[]) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		entry,
		photos = [],
		onsaved,
		ondelete,
		onphotoremoved,
		onphotosadded
	}: Props = $props();

	const prefs = preferences();
	const editing = $derived(entry !== undefined);

	let date = $state(todayIso());
	let weight = $state('');
	let notes = $state('');
	/** Held until the weigh-in exists, since a photo needs one to belong to. */
	let picked = $state<File[]>([]);
	let saving = $state(false);
	let failed = $state(false);
	let confirming = $state(false);

	$effect(() => {
		if (!open) {
			return;
		}

		date = entry?.entryDate ?? todayIso();
		weight = entry ? formatWeight(toDisplayWeight(entry.weight, prefs.weightUnit)) : '';
		notes = entry?.notes ?? '';
		picked = [];
		failed = false;
	});

	async function save() {
		if (!weight || !date || saving) {
			return;
		}
		saving = true;
		failed = false;

		try {
			const response = await fetch(
				editing ? `/api/body-weights/${entry?.objectId}` : '/api/body-weights',
				{
					method: editing ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...(editing ? { timestamp: entry?.timestamp, objectId: entry?.objectId } : {}),
						entryDate: date,
						weight: toStoredWeight(Number(weight), prefs.weightUnit),
						notes
					})
				}
			);

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const saved: BodyWeight = await response.json();

			// The weigh-in is logged either way: a photo that fails to upload
			// is worth a line in the console, not losing the reading.
			const uploaded = picked.length > 0 ? await uploadPhotos(picked, saved.objectId ?? '') : [];

			await onsaved(saved, uploaded);
			open = false;
		} catch (error) {
			console.error('Could not save the weigh-in: ', error);
			failed = true;
		} finally {
			saving = false;
		}
	}

	/** On an existing weigh-in there is nothing to wait for, so these go now. */
	async function addNow(files: File[]) {
		const uploaded = await uploadPhotos(files, entry?.objectId ?? '');

		if (uploaded.length > 0) {
			await onphotosadded?.(uploaded);
		}
	}
</script>

<Dialog
	bind:open
	title={editing ? t.bodyWeight.editWeighIn : t.bodyWeight.newWeighIn}
	description={editing ? longDate(entry?.entryDate ?? '') : undefined}
>
	{#if !editing}
		<Field id="weigh-in-date" label={t.common.date}>
			{#snippet children({ id, describedBy })}
				<TextInput {id} {describedBy} type="date" bind:value={date} />
			{/snippet}
		</Field>
	{/if}

	<Field id="weigh-in-weight" label={t.bodyWeight.weightLabel(prefs.weightUnit)}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={weight}
				inputmode="decimal"
				placeholder="0"
				enterkeyhint="next"
				onkeydown={(event) => event.key === 'Enter' && save()}
			/>
		{/snippet}
	</Field>

	<Field id="weigh-in-notes" label={t.common.notes}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={notes}
				placeholder={t.bodyWeight.notesPlaceholder}
				enterkeyhint="done"
				onkeydown={(event) => event.key === 'Enter' && save()}
			/>
		{/snippet}
	</Field>

	<!--
		Photos are files, written as they are picked rather than on Save --
		the same as tags elsewhere, and for the same reason: once the thing
		they belong to exists, there is nothing to batch them with.
	-->
	{#if editing}
		<PhotoPicker onpicked={addNow} />
		<PhotoGallery {photos} onremove={onphotoremoved} />
	{:else}
		<PhotoPicker bind:files={picked} />
	{/if}

	{#if failed}
		<p class="error" role="alert">{t.errors.logWeighIn}</p>
	{/if}

	{#snippet footer()}
		{#if editing && ondelete}
			<Button
				variant="ghost"
				icon="trash"
				onclick={() => {
					open = false;
					confirming = true;
				}}
			>
				{t.common.delete}
			</Button>
		{:else}
			<Button variant="ghost" onclick={() => (open = false)}>{t.common.cancel}</Button>
		{/if}
		<Button variant="primary" class="save" busy={saving} disabled={!weight} onclick={save}>
			{editing ? t.common.save : t.bodyWeight.addWeighIn}
		</Button>
	{/snippet}
</Dialog>

{#if entry && ondelete}
	<ConfirmDialog
		bind:open={confirming}
		title={t.confirm.deleteWeighIn}
		body={t.confirm.deleteWeighInBody}
		onconfirm={() => ondelete(entry)}
	/>
{/if}

<style>
	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}

	:global(dialog footer .save) {
		margin-left: auto;
	}
</style>
