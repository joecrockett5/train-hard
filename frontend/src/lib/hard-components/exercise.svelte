<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import SetComponent from '$lib/hard-components/set.svelte';
	import InlineSetEdit from '$lib/hard-components/inline-set-edit.svelte';
	import NewItem from '$lib/hard-components/new-item.svelte';
	import type { Exercise, Set } from '$lib/types';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { writable } from 'svelte/store';
	import ExerciseInfoComponent from '$lib/hard-components/exercise-info.svelte';
	import TagBadge from '$lib/hard-components/tag-badge.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { summariseSets } from '$lib/sets';
	import { sortTags } from '$lib/tags';
	import { toStoredWeight, weightUnit } from '$lib/units';

	export let exercise: Exercise;
	export let workoutId: string;
	export let deletionCallback: (exercise: Exercise) => void;

	let warmupSets: Set[] = [];
	let workingSets: Set[] = [];

	if (exercise.sets && exercise.sets.length > 0) {
		exercise.sets.forEach((set) => {
			if (set.setType === 'warmup') {
				warmupSets.push(set);
			} else {
				workingSets.push(set);
			}
		});
	}

	/** A timed exercise logs durations in minutes rather than reps at a weight. */
	$: timed = exercise.kind === 'time';

	let warmupSetWeight: number | undefined = undefined;
	let warmupSetReps: number | undefined = undefined;
	let warmupSetDuration: number | undefined = undefined;
	let warmupSetNotes = '';

	let workingSetWeight: number | undefined = undefined;
	let workingSetReps: number | undefined = undefined;
	let workingSetDuration: number | undefined = undefined;
	let workingSetNotes = '';

	const lastWorkingSet = workingSets.at(-1);
	if (lastWorkingSet) {
		workingSetWeight = lastWorkingSet.weight;
	}

	const creatingWarmupSet = writable(false);
	const creatingWorkingSet = writable(false);

	async function createWarmupSet() {
		creatingWarmupSet.set(true);
		const response = await fetch(
			`/api/exercise-joins?workout=${workoutId}&exercise=${exercise.objectId}`
		);
		const joinJson = await response.json();
		const join = joinJson[0];
		const createSetResponse = await fetch(`/api/sets`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				setType: 'warmup',
				// Typed in the unit on screen, stored in kilograms.
				weight: toStoredWeight(Number(warmupSetWeight ?? 0), $weightUnit),
				weightUnit: 'kg',
				reps: warmupSetReps ?? 0,
				duration: warmupSetDuration ?? 0,
				notes: warmupSetNotes,
				exerciseJoinId: join.objectId
			})
		});
		creatingWarmupSet.set(false);
		if (createSetResponse.ok) {
			const set = await createSetResponse.json();
			warmupSets.push(set);
			warmupSets = warmupSets;

			warmupSetWeight = undefined;
			warmupSetReps = undefined;
			warmupSetDuration = undefined;
			warmupSetNotes = '';
		} else {
			console.log('Error creating warmup set');
		}
	}

	async function createWorkingSet() {
		creatingWorkingSet.set(true);
		const response = await fetch(
			`/api/exercise-joins?workout=${workoutId}&exercise=${exercise.objectId}`
		);
		const joinJson = await response.json();
		const join = joinJson[0];
		const createSetResponse = await fetch(`/api/sets`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				setType: 'working',
				weight: toStoredWeight(Number(workingSetWeight ?? 0), $weightUnit),
				weightUnit: 'kg',
				reps: workingSetReps ?? 0,
				duration: workingSetDuration ?? 0,
				notes: workingSetNotes,
				exerciseJoinId: join.objectId
			})
		});
		creatingWorkingSet.set(false);
		if (createSetResponse.ok) {
			const set = await createSetResponse.json();
			workingSets.push(set);
			workingSets = workingSets;

			// workingSetWeight = 0;
			workingSetReps = undefined;
			workingSetDuration = undefined;
			workingSetNotes = '';
		} else {
			console.log('Error creating working set');
		}
	}

	async function deleteSet(set: Set) {
		const response = await fetch(`/api/sets/${set.objectId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			console.error('Failed to delete set: ', set);
		} else {
			if (set.setType === 'warmup') {
				warmupSets = warmupSets.filter((s: Set) => s.objectId !== set.objectId);
			} else {
				workingSets = workingSets.filter((s: Set) => s.objectId !== set.objectId);
			}
			goto(`/workouts/${workoutId}`);
		}
	}

	/** Keyed by the exercise-join timestamp, as /api/sets/recent returns it. */
	let oldInstances: Record<string, Set[]> | undefined;

	async function fetchOldSets() {
		const response = await fetch(`/api/sets/recent?exercise=${exercise.objectId}`);
		if (!response.ok) {
			console.error(`Failed to fetch old sets for ${exercise.name}, got ${response.status}`);
			return;
		}
		const instances: Record<string, Set[]> = await response.json();
		oldInstances = instances;
	}

	type OldInstance = {
		timestamp: Date;
		warmup: Set[];
		working: Set[];
		title: string;
	};

	function sortOldSets(instances: Record<string, Set[]> | undefined): OldInstance[] {
		const sortedInstances: OldInstance[] = [];

		if (!instances) {
			return sortedInstances;
		}

		for (const [timestamp, sets] of Object.entries(instances)) {
			const sortedSets = {
				timestamp: new Date(timestamp),
				warmup: sets.filter((set) => set.setType === 'warmup'),
				working: sets.filter((set) => set.setType === 'working'),
				title: ''
			};
			if (sets.length > 0) {
				// TODO: get workout title
			}

			sortedInstances.push(sortedSets);
		}
		// Sort chronologically
		sortedInstances.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		// `at(-1)` is undefined for an empty list, which the original code
		// dereferenced directly.
		const mostRecent = sortedInstances.at(-1);

		if (mostRecent && mostRecent.warmup.length > 0) {
			warmupSetWeight = mostRecent.warmup[0].weight;
		}

		if (mostRecent && mostRecent.working.length > 0 && workingSets.length === 0) {
			workingSetWeight = Math.max(...mostRecent.working.map((set) => set.weight));
		}

		return sortedInstances;
	}

	onMount(fetchOldSets);
	$: sortedOldInstances = sortOldSets(oldInstances);

	// Built from the live arrays rather than `exercise.sets`, so the minimised
	// card reflects sets logged since the page loaded.
	$: setSummary = summariseSets([...warmupSets, ...workingSets], {
		timed,
		unit: $weightUnit
	});
	$: tags = sortTags(exercise.tags ?? []);

	let minimized = true;

	function toggleMinimized() {
		minimized = !minimized;
	}

	function workDone(set: Set) {
		return timed ? (set.duration ?? 0) : set.weight * set.reps;
	}

	function heavier(newSet: Set, oldSet: Set) {
		return timed ? (newSet.duration ?? 0) > (oldSet.duration ?? 0) : newSet.weight > oldSet.weight;
	}

	// $: {
	// 	const applicableOldSets = sortedOldInstances.filter(
	// 		(item) => item.timestamp.getTime() >= new Date(exercise.timestamp).getTime()
	// 	);
	// 	const mostRecentWorkingSets = applicableOldSets.at(-1).working;
	// }

	function setComparison(newSet: Set, oldSet: Set | undefined) {
		// There may be no corresponding set in the earlier instance -- a
		// shorter previous session, or an index past its end.
		if (!oldSet) {
			return undefined;
		}
		if (heavier(newSet, oldSet)) {
			return 1;
		} else if (workDone(newSet) > workDone(oldSet)) {
			return 1;
		} else if (workDone(newSet) < workDone(oldSet)) {
			return -1;
		} else {
			return 0;
		}
	}
</script>

{#if !minimized}
	<Card.Root class="mt-4">
		<Dialog.Root>
			<Dialog.Trigger class={`float-right top-4 right-4 ${buttonVariants({ variant: 'ghost' })}`}
				>Delete</Dialog.Trigger
			>
			<Dialog.Content class="w-3/4">
				<Dialog.Header>
					<Dialog.Title>Are you sure?</Dialog.Title>
					<Dialog.Description>This cannot be undone.</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer>
					<Dialog.Close class={buttonVariants({ variant: 'ghost' })}>Cancel</Dialog.Close>
					<Dialog.Close
						on:click={() => deletionCallback(exercise)}
						class={buttonVariants({ variant: 'destructive' })}>Delete</Dialog.Close
					>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
		<Button on:click={toggleMinimized} variant="ghost" class="float-right top-4 right-4">
			Hide
		</Button>
		<Card.Header class="w-1/2">
			<Card.Title>
				{exercise.name}
			</Card.Title>
			{#if exercise.description}
				<Card.Description>{exercise.description}</Card.Description>
			{/if}
		</Card.Header>
		{#if tags.length > 0}
			<!-- Below the header, where the minimised card puts them. -->
			<Card.Content class="pb-0">
				<div class="flex flex-wrap gap-2">
					{#each tags as tag (tag.objectId)}
						<TagBadge {tag} />
					{/each}
				</div>
			</Card.Content>
		{/if}
		<Card.Content>
			<div>
				{#if oldInstances}
					<p><strong>Recent</strong></p>
					<div class="flex flex-row">
						{#each sortedOldInstances as sortedInstance, workoutIndex}
							<Popover.Root portal={null}>
								<Popover.Trigger asChild let:builder>
									<Button builders={[builder]} variant="outline" class="w-1/3 mx-0.5"
										>{new Date(sortedInstance.timestamp).toLocaleDateString('en-GB', {
											day: '2-digit',
											month: '2-digit',
											year: '2-digit'
										})}</Button
									>
								</Popover.Trigger>
								<Popover.Content class="w-80">
									{#if sortedInstance.warmup.length > 0}
										<h4 class="text-l font-bold">{timed ? 'Warmup' : 'Warmup Sets'}</h4>
										{#each sortedInstance.warmup as set}
											<SetComponent {set} deletionCallback={deleteSet} brief {timed} />
										{/each}
									{/if}
									{#if sortedInstance.working.length > 0}
										<h4 class="text-l font-bold mt-2">{timed ? 'Intervals' : 'Working Sets'}</h4>
										{#each sortedInstance.working as set, setIndex}
											{#if sortedOldInstances.at(workoutIndex - 1)}
												<SetComponent
													{set}
													deletionCallback={deleteSet}
													brief
													{timed}
													display={setComparison(
														set,
														sortedOldInstances.at(workoutIndex - 1)?.working.at(setIndex)
													)}
												/>
											{:else}
												<SetComponent {set} deletionCallback={deleteSet} brief {timed} />
											{/if}
										{/each}
									{/if}
								</Popover.Content>
							</Popover.Root>
						{/each}
					</div>
				{/if}
			</div>
			<div class="mt-4">
				<h3 class="text-xl font-bold">{timed ? 'Warmup' : 'Warmup Sets'}</h3>
				{#each warmupSets as set}
					<SetComponent {set} deletionCallback={deleteSet} {timed} />
				{/each}
				{#if $creatingWarmupSet}
					<Skeleton class="h-14 w-full mt-2" />
				{/if}
				<NewItem item={timed ? 'Warmup Interval' : 'Warmup Set'}>
					<InlineSetEdit
						{timed}
						bind:duration={warmupSetDuration}
						bind:reps={warmupSetReps}
						bind:weight={warmupSetWeight}
						bind:notes={warmupSetNotes}
					/>
					<Dialog.Footer>
						<Dialog.Close class={buttonVariants({ variant: 'default' })} on:click={createWarmupSet}
							>Add</Dialog.Close
						>
					</Dialog.Footer>
				</NewItem>
			</div>
			<div class="mt-6">
				<h3 class="text-xl font-bold">{timed ? 'Intervals' : 'Working Sets'}</h3>
				{#each workingSets as set, setIndex}
					<SetComponent
						{set}
						deletionCallback={deleteSet}
						{timed}
						display={setComparison(set, sortedOldInstances.at(-1)?.working.at(setIndex))}
					/>
				{/each}
				{#if $creatingWorkingSet}
					<Skeleton class="h-14 w-full mt-2" />
				{/if}
				<NewItem item={timed ? 'Interval' : 'Working Set'}>
					<InlineSetEdit
						{timed}
						bind:duration={workingSetDuration}
						bind:reps={workingSetReps}
						bind:weight={workingSetWeight}
						bind:notes={workingSetNotes}
					/>
					<Dialog.Footer>
						<Dialog.Close class={buttonVariants({ variant: 'default' })} on:click={createWorkingSet}
							>Add</Dialog.Close
						>
					</Dialog.Footer>
				</NewItem>
			</div>
		</Card.Content>
	</Card.Root>
{:else}
	<button on:click={toggleMinimized} class="w-full text-left">
		<ExerciseInfoComponent {exercise} brief {setSummary} />
	</button>
{/if}
