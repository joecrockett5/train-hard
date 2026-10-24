<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import { weightUnit } from '$lib/units';

	// Undefined until typed into: a new set starts with its fields blank.
	export let reps: number | undefined;
	export let weight: number | undefined;
	export let notes: string;
	/** Minutes, for a timed exercise. */
	export let duration: number | undefined = undefined;
	/** A timed exercise records a duration instead of reps at a weight. */
	export let timed = false;
</script>

<!--
	These were `type="tel"`, which asks iOS for the phone pad: a keypad
	carrying + * # and no decimal point at all, so a weight of 62.5 could not
	be typed on the keyboard the phone offered. `inputmode` asks for the right
	keypad instead -- the decimal pad for a weight, the plain number pad for a
	count of reps or minutes -- and leaves the type saying these are text,
	which is what they have always held.
-->
{#if timed}
	<span class="flex items-center gap-2">
		<Input
			placeholder="Minutes"
			type="text"
			inputmode="numeric"
			autofocus
			bind:value={duration}
			class="w-20"
		/> minutes
	</span>
{:else}
	<span class="flex items-center gap-2">
		<Input
			placeholder="Reps"
			type="text"
			inputmode="numeric"
			autofocus
			bind:value={reps}
			class="w-20"
		/> reps @
		<Input
			placeholder={$weightUnit}
			type="text"
			inputmode="decimal"
			bind:value={weight}
			class="w-16"
		/>
		{$weightUnit}
	</span>
{/if}
<Input placeholder="Notes" bind:value={notes} class="mt-4 mb-2" />
