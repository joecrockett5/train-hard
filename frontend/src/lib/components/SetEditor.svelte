<script lang="ts">
	import TextInput from '$ui/TextInput.svelte';
	import Field from '$ui/Field.svelte';
	import { preferences } from '$lib/preferences.svelte';
	import { t } from '$lib/i18n';

	/**
	 * The fields of one set.
	 *
	 * `inputmode` rather than `type`: these were `type="tel"`, which asks iOS
	 * for the phone pad -- a keypad carrying + * # and no decimal point at
	 * all, so a weight of 62.5 could not be typed on the keyboard the phone
	 * offered. `decimal` for a weight, `numeric` for a count of reps or
	 * minutes.
	 */
	type Props = {
		reps?: string;
		weight?: string;
		duration?: string;
		notes?: string;
		/** A timed exercise records a duration instead of reps at a weight. */
		timed?: boolean;
		/** Prefix for the field ids, so two editors on one screen do not collide. */
		idPrefix: string;
		onsubmit?: () => void;
	};

	let {
		reps = $bindable(''),
		weight = $bindable(''),
		duration = $bindable(''),
		notes = $bindable(''),
		timed = false,
		idPrefix,
		onsubmit
	}: Props = $props();

	const prefs = preferences();

	function enter(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onsubmit?.();
		}
	}
</script>

<div class="editor">
	{#if timed}
		<Field id="{idPrefix}-duration" label={t.sets.minutes} class="narrow">
			{#snippet children({ id, describedBy })}
				<TextInput
					{id}
					{describedBy}
					bind:value={duration}
					inputmode="decimal"
					placeholder="0"
					enterkeyhint="done"
					onkeydown={enter}
				/>
			{/snippet}
		</Field>
	{:else}
		<div class="pair">
			<Field id="{idPrefix}-reps" label={t.sets.reps}>
				{#snippet children({ id, describedBy })}
					<TextInput
						{id}
						{describedBy}
						bind:value={reps}
						inputmode="numeric"
						placeholder="0"
						enterkeyhint="next"
						onkeydown={enter}
					/>
				{/snippet}
			</Field>
			<Field id="{idPrefix}-weight" label="{t.sets.weight} ({prefs.weightUnit})">
				{#snippet children({ id, describedBy })}
					<TextInput
						{id}
						{describedBy}
						bind:value={weight}
						inputmode="decimal"
						placeholder="0"
						enterkeyhint="done"
						onkeydown={enter}
					/>
				{/snippet}
			</Field>
		</div>
	{/if}

	<Field id="{idPrefix}-notes" label={t.common.notes}>
		{#snippet children({ id, describedBy })}
			<TextInput
				{id}
				{describedBy}
				bind:value={notes}
				placeholder={t.common.optional}
				enterkeyhint="done"
				onkeydown={enter}
			/>
		{/snippet}
	</Field>
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.editor :global(.narrow) {
		max-width: 10rem;
	}
</style>
