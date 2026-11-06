<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import TagPicker from './TagPicker.svelte';
	import type { Exercise, Tag, Template } from '$lib/types';
	import { createTemplateFrom } from '$lib/templates';
	import { t } from '$lib/i18n';

	/**
	 * Turning the workout you are looking at into a template.
	 *
	 * The other half of importing one: a list worth repeating is usually one
	 * you have just finished rather than one you sat down to write, so this
	 * takes the exercises as they are and asks only for the naming.
	 *
	 * No check for whether this workout came from a template already. Nothing
	 * records that it did, and a workout that has drifted from the template it
	 * started as is exactly when saving it back is wanted.
	 */
	type Props = {
		open?: boolean;
		/** The exercises to put in it, in the order the workout shows them. */
		exercises: Exercise[];
		allTags?: Tag[];
		defaultName?: string;
	};

	let {
		open = $bindable(false),
		exercises,
		allTags = $bindable([]),
		defaultName = ''
	}: Props = $props();

	let name = $state('');
	let notes = $state('');
	let tags = $state<Tag[]>([]);
	let saving = $state(false);
	let failed = $state(false);
	/** The template once it exists, so the dialog can offer a way to it. */
	let saved = $state<Template | null>(null);

	$effect(() => {
		if (!open) {
			return;
		}

		name = defaultName;
		notes = '';
		tags = [];
		saved = null;
		failed = false;
	});

	async function save() {
		const trimmed = name.trim();

		if (!trimmed || saving) {
			return;
		}
		saving = true;
		failed = false;

		try {
			saved = await createTemplateFrom({ name: trimmed, notes, tags }, exercises);
		} catch (error) {
			console.error(`Could not save '${trimmed}' as a template: `, error);
			failed = true;
		} finally {
			saving = false;
		}
	}
</script>

{#if saved}
	{@const made = saved}
	<Dialog
		bind:open
		title={t.templates.saved(made.name)}
		description={t.templates.savedBody(made.exerciseCount ?? 0)}
	>
		<!--
			Stays on the workout rather than following the new template: this
			is reachable mid-session, and being taken out of a workout you are
			still logging is worse than a second tap for the rarer case of
			wanting to tidy the template now.
		-->
		{#snippet children()}
			<p class="note">{t.templates.saveAsBody(made.exerciseCount ?? 0)}</p>
		{/snippet}

		{#snippet footer()}
			<Button variant="ghost" onclick={() => (open = false)}>{t.templates.stayHere}</Button>
			<Button variant="primary" class="save" href="/templates/{made.objectId}">
				{t.templates.openTemplate}
			</Button>
		{/snippet}
	</Dialog>
{:else}
	<Dialog
		bind:open
		title={t.templates.saveAsTitle}
		description={exercises.length === 0
			? t.templates.saveAsEmpty
			: t.templates.saveAsBody(exercises.length)}
	>
		<Field id="save-template-name" label={t.common.name}>
			{#snippet children({ id, describedBy })}
				<TextInput
					{id}
					{describedBy}
					bind:value={name}
					placeholder={t.templates.namePlaceholder}
					enterkeyhint="done"
					onkeydown={(event) => event.key === 'Enter' && save()}
				/>
			{/snippet}
		</Field>

		<Field id="save-template-notes" label={t.common.notes}>
			{#snippet children({ id, describedBy })}
				<TextInput {id} {describedBy} bind:value={notes} placeholder={t.common.optional} />
			{/snippet}
		</Field>

		<TagPicker bind:allTags bind:selected={tags} />

		{#if failed}
			<p class="error" role="alert">{t.errors.createTemplate}</p>
		{/if}

		{#snippet footer()}
			<Button variant="ghost" onclick={() => (open = false)}>{t.common.cancel}</Button>
			<Button
				variant="primary"
				class="save"
				busy={saving}
				disabled={!name.trim() || exercises.length === 0}
				onclick={save}
			>
				{t.templates.saveAs}
			</Button>
		{/snippet}
	</Dialog>
{/if}

<style>
	.note,
	.error {
		font-size: var(--text-sm);
	}

	.note {
		color: var(--ink-muted);
	}

	.error {
		color: var(--danger);
	}

	:global(dialog footer .save) {
		margin-left: auto;
	}
</style>
