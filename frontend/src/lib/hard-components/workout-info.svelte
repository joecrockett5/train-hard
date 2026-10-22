<script lang="ts">
	import type { Exercise, Tag, WorkoutInfo } from '$lib/types';
	import * as Card from '$lib/components/ui/card';
	import { buttonVariants, Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import ConfirmDelete from '$lib/hard-components/confirm-delete-workout-info.svelte';
	import SaveAsTemplate from '$lib/hard-components/save-as-template.svelte';

	export let workout: WorkoutInfo;
	export let href: string = '';
	// Only reachable through the edit dialog, which `brief` hides, so
	// callers rendering a brief card legitimately omit it.
	export let deletionCallback: (workout: WorkoutInfo) => void = () => {};
	export let brief: boolean = false;
	/**
	 * This workout's exercises, for saving it as a template. Only the full
	 * card offers that, so a brief one legitimately omits them.
	 */
	export let exercises: Exercise[] = [];
	/** Every tag the profile has, for that dialog's picker. */
	export let allTags: Tag[] = [];

	let updatedTitle = workout.title;
	let updatedNotes = workout.notes;

	async function updateWorkout() {
		const response = await fetch(`/api/workouts/${workout.objectId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				timestamp: workout.timestamp,
				objectId: workout.objectId,
				title: updatedTitle,
				notes: updatedNotes,
				workoutDate: workout.workoutDate
			})
		});

		if (!response.ok) {
			console.error('Failed to update workout: ', workout);
		} else {
			workout.title = updatedTitle;
			workout.notes = updatedNotes;
		}
	}

	let asDate = new Date(workout.workoutDate);
	$: formattedDate = asDate.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
</script>

<Card.Root class="mt-4">
	{#if !brief}
		<Dialog.Root>
			<Dialog.Trigger class={`float-right top-4 right-4 ${buttonVariants({ variant: 'ghost' })}`}
				>Edit</Dialog.Trigger
			>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Edit {workout.title}</Dialog.Title>
					<Dialog.Description>Edit this workout</Dialog.Description>
				</Dialog.Header>
				<label for="date">Date</label>
				<Input value={formattedDate} disabled />
				<label for="title">Title</label>
				<Input placeholder="Title" bind:value={updatedTitle} />
				<label for="Notes">Notes</label>
				<Input placeholder="Notes" bind:value={updatedNotes} />

				<!--
					Here rather than on the page itself: this is a thing you
					do to the whole workout, like deleting it, and the page
					behind is the one you are looking at between sets. A
					second permanent button there would be in the way of the
					screen's actual job.
				-->
				<SaveAsTemplate {exercises} bind:allTags defaultName={workout.title} />
				<br />
				<Dialog.Footer class="flex flex-row gap-2">
					<ConfirmDelete {deletionCallback} {workout} />
					<Dialog.Close
						class={buttonVariants({ variant: 'default' }) + ' ml-auto'}
						on:click={updateWorkout}>Save</Dialog.Close
					>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
		<Button
			variant="ghost"
			class="float-right top-4 right-4"
			href={`/workouts?date=${workout.workoutDate}`}>⤶</Button
		>
	{/if}
	<Card.Header>
		<Card.Title>
			<a {href}>{workout.title}</a>
		</Card.Title>
		<Card.Description>Workout on {formattedDate}</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="grid grid-cols-2 gap-4">
			<div class="flex flex-col gap-2">
				<div class="flex gap-2">
					{#if workout.tags && workout.tags.length > 0}
						<div class="flex-1">
							<span class="text-sm font-semibold">Tags</span>
							<div class="flex flex-wrap gap-2">
								{#each workout.tags as tag}
									<div class="flex items-center gap-2">
										<span
											class="rounded-full w-4 h-4 bg-gray-200"
											style="background-color: {tag.colorHex}"
										/>
										<span>{tag.name}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if workout.notes}
						<div class="flex-1">
							<span class="text-sm font-semibold">Notes</span>
							<p>{workout.notes}</p>
						</div>
					{/if}
				</div>
			</div>
		</div></Card.Content
	>
</Card.Root>
