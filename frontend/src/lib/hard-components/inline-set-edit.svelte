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

{#if timed}
	<span class="flex items-center gap-2">
		<Input placeholder="Minutes" type="tel" autofocus bind:value={duration} class="w-20" /> minutes
	</span>
{:else}
	<span class="flex items-center gap-2">
		<Input placeholder="Reps" type="tel" autofocus bind:value={reps} class="w-20" /> reps @
		<!--
			`inputmode` rather than `type="tel"`: tel asks for the phone pad,
			which carries + * # and no decimal point at all. This asks iOS for
			the decimal pad instead. Both hold text either way.
		-->
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
