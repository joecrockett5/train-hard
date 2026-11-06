<script lang="ts">
	import Button from './Button.svelte';
	import { t } from '$lib/i18n';
	import { dayOfMonth, monthYear, weekdayDate } from '$lib/i18n/format';
	import { addDays, addMonths, monthGrid, sameMonth, startOfMonth, todayIso } from '$lib/dates';

	/**
	 * A month grid.
	 *
	 * Written rather than pulled in: the app needs one calendar, on one
	 * screen, and the library it replaces brought a date package with it for a
	 * grid that is six rows of seven buttons.
	 *
	 * Keyboard handling is the part worth being careful about. The grid is one
	 * tab stop, not thirty-one, with the arrows moving a day, Page Up and Down
	 * a month, and Home and End the week -- which is the pattern every native
	 * date picker uses and the one a screen reader describes.
	 */
	type Props = {
		/** The selected day, `YYYY-MM-DD`. */
		value: string;
		/** Days to mark as having something on them. */
		marked?: Set<string>;
		onselect?: (iso: string) => void;
	};

	let { value = $bindable(todayIso()), marked = new Set<string>(), onselect }: Props = $props();

	const today = todayIso();

	/** The month on screen, which can differ from the selection while paging. */
	let month = $state(startOfMonth(value));
	/** Where the keyboard is, which can differ from the selection while moving. */
	let cursor = $state(value);
	/** Set only by a key press, so paging with the mouse does not steal focus. */
	let grabFocus = $state(false);

	const weeks = $derived(monthGrid(month));

	// Selecting a day elsewhere -- a swipe, a deep link -- brings the grid to it.
	$effect(() => {
		if (!sameMonth(value, month)) {
			month = startOfMonth(value);
		}
		cursor = value;
	});

	$effect(() => {
		if (!grabFocus) {
			return;
		}

		grabFocus = false;
		document.querySelector<HTMLButtonElement>(`[data-day="${cursor}"]`)?.focus();
	});

	function choose(iso: string) {
		value = iso;
		cursor = iso;
		month = startOfMonth(iso);
		onselect?.(iso);
	}

	function moveTo(iso: string) {
		cursor = iso;
		month = startOfMonth(iso);
		grabFocus = true;
	}

	function onkeydown(event: KeyboardEvent) {
		const moves: Record<string, () => string> = {
			ArrowLeft: () => addDays(cursor, -1),
			ArrowRight: () => addDays(cursor, 1),
			ArrowUp: () => addDays(cursor, -7),
			ArrowDown: () => addDays(cursor, 7),
			Home: () => addDays(cursor, -new Date(`${cursor}T00:00:00Z`).getUTCDay()),
			End: () => addDays(cursor, 6 - new Date(`${cursor}T00:00:00Z`).getUTCDay()),
			PageUp: () => addMonths(cursor, -1),
			PageDown: () => addMonths(cursor, 1)
		};

		const move = moves[event.key];

		if (!move) {
			return;
		}

		event.preventDefault();
		moveTo(move());
	}
</script>

<div class="calendar">
	<div class="head">
		<Button
			variant="ghost"
			iconOnly
			icon="chevronLeft"
			size="sm"
			label={t.calendar.previousMonth}
			onclick={() => (month = addMonths(month, -1))}
		/>
		<h2 aria-live="polite">{monthYear(month)}</h2>
		<Button
			variant="ghost"
			iconOnly
			icon="chevronRight"
			size="sm"
			label={t.calendar.nextMonth}
			onclick={() => (month = addMonths(month, 1))}
		/>
	</div>

	<div class="weekdays" aria-hidden="true">
		{#each t.calendar.weekdaysNarrow as initial, index (index)}
			<span>{initial}</span>
		{/each}
	</div>

	<!--
		`role="grid"` with one tab stop. The buttons keep their own roles, so
		each still announces as a button with its full date and its state.
	-->
	<div class="grid" role="grid" tabindex={-1} aria-label={monthYear(month)} {onkeydown}>
		{#each weeks as week, index (index)}
			<div class="week" role="row">
				{#each week as day (day)}
					{@const outside = !sameMonth(day, month)}
					<button
						type="button"
						role="gridcell"
						class="day"
						class:outside
						class:selected={day === value}
						class:today={day === today}
						data-day={day}
						tabindex={day === cursor ? 0 : -1}
						aria-label={weekdayDate(day)}
						aria-selected={day === value}
						aria-current={day === today ? 'date' : undefined}
						onclick={() => choose(day)}
					>
						<span class="number">{dayOfMonth(day)}</span>
						{#if marked.has(day)}
							<span class="dot" aria-label={t.calendar.hasWorkouts}></span>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.calendar {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	h2 {
		font-size: var(--text-base);
		font-weight: 600;
	}

	.weekdays,
	.week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
	}

	.weekdays span {
		padding-block: var(--space-1);
		text-align: center;
		font-size: var(--text-2xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-subtle);
	}

	.day {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		/* Square-ish and never below the minimum target. */
		min-height: var(--touch);
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		transition:
			background-color var(--dur-fast) var(--ease),
			color var(--dur-fast) var(--ease);
	}

	.day:hover:not(.selected) {
		background: var(--surface-hover);
	}

	.day.outside {
		color: var(--ink-subtle);
		opacity: 0.55;
	}

	.day.today .number {
		font-weight: 700;
		color: var(--brand);
	}

	.day.selected {
		background: var(--brand-ramp);
		color: var(--on-brand);
	}

	.day.selected .number {
		color: var(--on-brand);
		font-weight: 700;
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: var(--radius-full);
		background: var(--brand);
	}

	.day.selected .dot {
		background: var(--on-brand);
	}

	.day.outside .dot {
		opacity: 0.6;
	}
</style>
