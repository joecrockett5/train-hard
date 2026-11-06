<script lang="ts">
	import Dialog from '$ui/Dialog.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import ConfirmDialog from '$ui/ConfirmDialog.svelte';
	import TagPicker from './TagPicker.svelte';
	import type { Tag, Template } from '$lib/types';
	import { createTemplateFrom } from '$lib/templates';
	import { t } from '$lib/i18n';

	/**
	 * Creating or editing a template.
	 *
	 * `description` is the backend's field name; the UI calls it Notes, which
	 * is what a workout calls its own free text.
	 */
	type Props = {
		open?: boolean;
		/** Absent when creating. */
		template?: Template;
		allTags?: Tag[];
		onsaved: (template: Template) => void | Promise<void>;
		ondelete?: (template: Template) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		template,
		allTags = $bindable([]),
		onsaved,
		ondelete
	}: Props = $props();

	const editing = $derived(template !== undefined);

	let name = $state('');
	let notes = $state('');
	let tags = $state<Tag[]>([]);
	let saving = $state(false);
	let failed = $state(false);
	let confirming = $state(false);

	$effect(() => {
		if (!open) {
			return;
		}

		name = template?.name ?? '';
		notes = template?.description ?? '';
		tags = [...(template?.tags ?? [])];
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
			if (editing) {
				const response = await fetch(`/api/templates/${template?.objectId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						timestamp: template?.timestamp,
						objectId: template?.objectId,
						name: trimmed,
						description: notes.trim()
					})
				});

				if (!response.ok) {
					throw new Error(`Backend returned ${response.status}`);
				}

				// Tags are joins the picker already wrote as they were toggled.
				await onsaved({ ...(await response.json()), tags });
			} else {
				await onsaved(await createTemplateFrom({ name: trimmed, notes, tags }));
			}

			open = false;
		} catch (error) {
			console.error('Could not save the template: ', error);
			failed = true;
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	title={editing ? t.templates.editTemplate(template?.name ?? '') : t.templates.newTemplate}
	description={editing ? undefined : t.templates.exercisesAddedLater}
>
	<Field id="template-name" label={t.common.name}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={name}
				placeholder={t.templates.namePlaceholder}
				enterkeyhint="next"
				onkeydown={(event) => event.key === 'Enter' && save()}
			/>
		{/snippet}
	</Field>

	<Field id="template-notes" label={t.common.notes}>
		{#snippet children({ id, describedBy })}
			<TextInput {id} {describedBy} bind:value={notes} placeholder={t.common.optional} />
		{/snippet}
	</Field>

	<TagPicker
		bind:allTags
		bind:selected={tags}
		targetId={editing ? (template?.objectId ?? '') : ''}
	/>

	{#if failed}
		<p class="error" role="alert">{t.errors.createTemplate}</p>
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
		<Button variant="primary" class="save" busy={saving} disabled={!name.trim()} onclick={save}>
			{editing ? t.common.save : t.templates.addTemplate}
		</Button>
	{/snippet}
</Dialog>

{#if template && ondelete}
	<ConfirmDialog
		bind:open={confirming}
		title={t.confirm.deleteTemplate(template.name)}
		body={t.confirm.deleteTemplateBody}
		onconfirm={() => ondelete(template)}
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
