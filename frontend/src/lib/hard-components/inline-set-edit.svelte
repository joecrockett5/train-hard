<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';

	// Undefined until typed into: a new set starts with both fields blank.
	export let reps: number | undefined;
	export let weight: number | undefined;
	export let notes: string;
</script>

<span class="flex gap-2 items-center">
	<Input placeholder="Reps" type="tel" autofocus bind:value={reps} class="w-20" /> reps @
	<Input placeholder="kg" type="tel" bind:value={weight} class="w-14" /> kg
</span>
<Input placeholder="Notes" bind:value={notes} class="mt-4 mb-2" />
