<script lang="ts">
	/**
	 * A text field.
	 *
	 * `inputmode` rather than `type="number"` for the numeric ones: `tel`
	 * asks iOS for a keypad with no decimal point, so a weight of 62.5 could
	 * not be typed at all, and `number` brings spinners and a value that
	 * empties itself on a stray character. `decimal` for a weight, `numeric`
	 * for a count of reps or minutes.
	 *
	 * The font size is 16px and never smaller: iOS zooms the page in on focus
	 * for anything under that, and does not zoom back out.
	 */
	type Props = {
		id?: string;
		value?: string;
		type?: 'text' | 'date' | 'search';
		inputmode?: 'text' | 'numeric' | 'decimal' | 'search';
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		autocomplete?: 'on' | 'off';
		invalid?: boolean;
		describedBy?: string;
		enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'search' | 'send';
		class?: string;
		onkeydown?: (event: KeyboardEvent) => void;
		oninput?: (event: Event) => void;
		[key: string]: unknown;
	};

	// svelte-ignore custom_element_props_identifier
	let {
		id,
		value = $bindable(''),
		type = 'text',
		inputmode,
		placeholder,
		disabled = false,
		readonly = false,
		required = false,
		autocomplete = 'off',
		invalid = false,
		describedBy,
		enterkeyhint,
		class: className = '',
		onkeydown,
		oninput,
		...rest
	}: Props = $props();
</script>

<input
	{id}
	{type}
	{inputmode}
	{placeholder}
	{disabled}
	{readonly}
	{required}
	{autocomplete}
	{enterkeyhint}
	class="input {className}"
	class:invalid
	aria-invalid={invalid ? 'true' : undefined}
	aria-describedby={describedBy}
	bind:value
	{onkeydown}
	{oninput}
	{...rest}
/>

<style>
	.input {
		width: 100%;
		min-width: 0;
		min-height: var(--touch);
		padding: 0 var(--space-3);
		background: var(--surface-sunken);
		border: 1px solid var(--field-line);
		border-radius: var(--radius-md);
		color: var(--ink);
		/* 16px: anything smaller and iOS zooms the page on focus. */
		font-size: var(--text-base);
		transition:
			border-color var(--dur-fast) var(--ease),
			background-color var(--dur-fast) var(--ease);
	}

	.input::placeholder {
		color: var(--ink-subtle);
	}

	.input:hover:not(:disabled) {
		background: var(--surface-hover);
	}

	.input:focus-visible {
		outline: 2px solid var(--brand);
		outline-offset: 1px;
		border-color: var(--brand);
	}

	.input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.input.invalid {
		border-color: var(--danger);
	}

	/*
	 * A date input is a native control with parts of its own -- the day,
	 * month and year fields and the picker button. Left to the browser's
	 * defaults inside a flex row it packs those to the left and strands the
	 * calendar button mid-field; WebKit also centres the value with margins
	 * of its own, so the date sits off the line the other fields are on.
	 */
	.input[type='date'] {
		display: block;
		-webkit-appearance: none;
		appearance: none;
	}

	.input[type='date']::-webkit-date-and-time-value {
		margin: 0;
		text-align: left;
	}

	.input[type='date']::-webkit-calendar-picker-indicator {
		margin-left: auto;
		cursor: pointer;
		opacity: 0.6;
	}

	:global(:root[data-theme='dark']) .input[type='date']::-webkit-calendar-picker-indicator {
		filter: invert(1);
	}
</style>
