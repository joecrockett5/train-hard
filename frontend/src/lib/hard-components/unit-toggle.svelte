<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { weightUnit, type WeightUnit } from '$lib/units';

	/**
	 * Read from the store, not taken as a prop.
	 *
	 * The nav sheet rebuilds its contents each time it opens, so a prop
	 * captured the profile's value as the page was loaded and the button
	 * went back to reading "kg" after every toggle until a reload. The store
	 * is the live value the rest of the app renders from.
	 */
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
		const previous: WeightUnit = $weightUnit;
		const next: WeightUnit = previous === 'kg' ? 'lbs' : 'kg';

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
	aria-label={$weightUnit === 'kg' ? 'Show weights in pounds' : 'Show weights in kilograms'}
	title={$weightUnit === 'kg' ? 'Show weights in pounds' : 'Show weights in kilograms'}
>
	<span class="text-sm font-semibold">{$weightUnit}</span>
</Button>
