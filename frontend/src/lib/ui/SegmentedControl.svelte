<script lang="ts" generics="Value extends string">
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	/**
	 * A two-or-three-way choice: Light / Dark, kg / lbs, Reps / Time.
	 *
	 * Real radio inputs underneath, visually hidden. That is what gets arrow
	 * key navigation, the roving tab stop and the group semantics for free --
	 * the old UI used two `aria-pressed` buttons, which announces as two
	 * unrelated toggles and lets both read as pressed.
	 */
	type Option = {
		value: Value;
		label: string;
		icon?: IconName;
	};

	type Props = {
		/** Names the radio group; must be unique on the page. */
		name: string;
		legend: string;
		hideLegend?: boolean;
		options: Option[];
		value: Value;
		disabled?: boolean;
		onchange?: (value: Value) => void;
	};

	let {
		name,
		legend,
		hideLegend = true,
		options,
		value = $bindable(),
		disabled = false,
		onchange
	}: Props = $props();

	function pick(next: Value) {
		if (next === value) {
			return;
		}

		value = next;
		onchange?.(next);
	}
</script>

<fieldset class="segmented" {disabled}>
	<legend class={hideLegend ? 'sr-only' : 'legend'}>{legend}</legend>
	<div class="track" style="--count: {options.length}">
		{#each options as option (option.value)}
			<label class="segment" class:selected={option.value === value}>
				<input
					type="radio"
					{name}
					value={option.value}
					checked={option.value === value}
					{disabled}
					onchange={() => pick(option.value)}
				/>
				{#if option.icon}<Icon name={option.icon} size={1.05} />{/if}
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	.segmented {
		border: none;
		min-width: 0;
	}

	.legend {
		padding: 0 0 var(--space-2);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.track {
		display: grid;
		grid-template-columns: repeat(var(--count), 1fr);
		gap: var(--space-1);
		padding: var(--space-1);
		background: var(--surface-sunken);
		border: 1px solid var(--line);
		border-radius: var(--radius-md);
	}

	.segment {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		/* Full height of a touch target even though the track has padding. */
		min-height: calc(var(--touch) - 2 * var(--space-1));
		padding-inline: var(--space-2);
		border-radius: calc(var(--radius-md) - var(--space-1));
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink-muted);
		cursor: pointer;
		transition:
			background-color var(--dur-fast) var(--ease),
			color var(--dur-fast) var(--ease),
			box-shadow var(--dur-fast) var(--ease);
	}

	.segment:hover:not(.selected) {
		color: var(--ink);
	}

	.segment.selected {
		background: var(--surface-raised);
		color: var(--ink);
		box-shadow: var(--shadow-1);
	}

	/* Hidden from sight, not from the keyboard or a screen reader. */
	input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.segment:has(input:focus-visible) {
		outline: 2px solid var(--brand);
		outline-offset: 2px;
	}

	fieldset:disabled .segment {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
