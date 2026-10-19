<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { weightUnit, type WeightUnit } from '$lib/units';

	/** The active profile's stored preference, as the server rendered it. */
	export let unit: WeightUnit;

	let saving = false;

	/**
	 * Flips the unit the whole app shows weights in, and persists it.
	 *
	 * Same shape as the theme toggle, for the same reason: the store changes
	 * first so every weight on screen updates at once, and goes back if the
	 * write fails, so what is shown never disagrees with what is stored.
	 * Nothing is converted in the database -- weights are always kilograms.
	 */
	async function toggle() {
		const next: WeightUnit = unit === 'kg' ? 'lbs' : 'kg';
		const previous = unit;

		unit = next;
		weightUnit.set(next);
		saving = true;

		try {
			const response = await fetch('/api/preferences', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ weightUnit: next })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
		} catch (error) {
			console.error('Failed to save the weight unit: ', error);
			unit = previous;
			weightUnit.set(previous);
		} finally {
			saving = false;
		}
	}
</script>

<Button
	variant="ghost"
	size="icon"
	on:click={toggle}
	disabled={saving}
	aria-label={unit === 'kg' ? 'Show weights in pounds' : 'Show weights in kilograms'}
	title={unit === 'kg' ? 'Show weights in pounds' : 'Show weights in kilograms'}
>
	<span class="text-sm font-semibold">{unit}</span>
</Button>
