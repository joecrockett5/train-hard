<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import WeightChart from '$lib/hard-components/weight-chart.svelte';
	import { todayIso } from '$lib/dates';
	import type { WorkoutInfo } from '$lib/types';

	export let data;

	let open = false;
	let creating = false;
	let failed = false;
	let newTitle = '';
	let newNotes = '';

	const today = todayIso();
	$: formattedDate = new Date(`${today}T00:00:00Z`).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});

	/**
	 * Starts a workout dated today and opens it.
	 *
	 * The dialog is closed here rather than by a `Dialog.Close` on the button,
	 * so that a failure leaves it open with what was typed still in it --
	 * closing first would lose the title and give no sign anything went wrong.
	 * Nothing stops a second workout on the same day, which the workouts page
	 * already allows.
	 */
	async function addWorkout() {
		if (creating || !newTitle.trim()) {
			return;
		}
		creating = true;
		failed = false;

		try {
			const response = await fetch('/api/workouts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newTitle.trim(),
					notes: newNotes.trim(),
					workoutDate: today
				})
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const created: WorkoutInfo = await response.json();

			open = false;
			newTitle = '';
			newNotes = '';
			await goto(`/workouts/${created.objectId}`);
		} catch (error) {
			console.error("Failed to start today's workout: ", error);
			failed = true;
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>hard: Home</title>
</svelte:head>

<img src="/hard-logo.png" alt="Hard Logo" class="mx-auto mt-6 mb-4 h-32 w-32 rounded-xl" />

{#if data.profile}
	<Card.Root>
		<Card.Header class="py-4">
			<Card.Title class="text-center text-lg">{data.profile.name}</Card.Title>
		</Card.Header>
	</Card.Root>
{/if}

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants() + ' mt-4 h-16 w-full text-base'}>
		<Plus class="mr-2 h-5 w-5" />
		Start today's workout
	</Dialog.Trigger>
	<Dialog.Content class="w-3/4 max-w-lg">
		<Dialog.Header>
			<Dialog.Title>New Workout</Dialog.Title>
			<Dialog.Description>{formattedDate}</Dialog.Description>
		</Dialog.Header>
		<label for="title">Title</label>
		<Input
			placeholder="Title"
			bind:value={newTitle}
			on:keydown={(event) => event.key === 'Enter' && addWorkout()}
		/>
		<label for="notes">Notes</label>
		<Input placeholder="Notes" bind:value={newNotes} />
		{#if failed}
			<p class="text-destructive text-sm">Could not start the workout. Try again.</p>
		{/if}
		<br />
		<Dialog.Footer>
			<Button on:click={addWorkout} disabled={!newTitle.trim() || creating}>
				{creating ? 'Starting…' : 'Start'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

{#if data.weightsUnavailable}
	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Title>Progress</Card.Title>
			<Card.Description>Could not load your weigh-ins just now.</Card.Description>
		</Card.Header>
	</Card.Root>
{:else}
	<!--
		The whole card is the link, rather than a button inside it: on a phone
		the card is the target you actually aim at.
	-->
	<a href="/body-weight" class="block rounded-lg">
		<WeightChart entries={data.bodyWeights} />
	</a>
{/if}

<div class="mb-8" />
