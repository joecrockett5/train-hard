<script lang="ts">
	import '../app.css';

	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import MenuIcon from '$lib/svg/menu-icon.svelte';
	import ThemeToggle from '$lib/hard-components/theme-toggle.svelte';
	import UnitToggle from '$lib/hard-components/unit-toggle.svelte';
	import { weightUnit } from '$lib/units';
	import type { WorkoutInfo } from '$lib/types';

	export let data;

	/**
	 * Every screen opens at the top.
	 *
	 * SvelteKit already does this for a plain link, but not for back and
	 * forward, where it restores the old position, and not for a `goto` to
	 * the route you are already on -- which is how the workout page reloads
	 * itself after a set is deleted, landing you mid-page.
	 */
	afterNavigate(() => {
		window.scrollTo(0, 0);
	});

	/**
	 * The unit every weight in the app is shown in, from the active profile.
	 *
	 * Set here rather than passed down: a set's weight is rendered several
	 * components deep, and this follows the profile exactly as the theme
	 * does. Reassigned on navigation, which is also what picks up a profile
	 * switch.
	 */
	$: weightUnit.set(data.profile?.weightUnit ?? 'kg');

	let sheetOpen = false;
	let recent: WorkoutInfo[] = [];
	let loadedRecent = false;

	/**
	 * The last couple of workouts, for getting back into one.
	 *
	 * Fetched when the sheet is first opened rather than in the layout's
	 * load: the sheet is opened occasionally, and the alternative is listing
	 * every workout on every page render.
	 */
	async function loadRecent() {
		if (loadedRecent) {
			return;
		}
		loadedRecent = true;

		try {
			const response = await fetch('/api/workouts');

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const workouts: WorkoutInfo[] = await response.json();
			recent = workouts
				.sort(
					(a, b) =>
						b.workoutDate.localeCompare(a.workoutDate) ||
						(b.timestamp ?? '').localeCompare(a.timestamp ?? '')
				)
				.slice(0, 2);
		} catch (error) {
			console.error('Failed to load recent workouts: ', error);
			// Let the next open try again rather than leaving the section empty.
			loadedRecent = false;
		}
	}

	$: if (sheetOpen) {
		loadRecent();
	}

	function shortDate(isoDate: string): string {
		return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	}

	/**
	 * Keeps the theme class in step with the active profile.
	 *
	 * hooks.server.ts puts the class on <html> so the first paint is right,
	 * but that only happens for a full document load. The profile picker
	 * submits with `use:enhance`, so choosing a profile is a client-side
	 * navigation and the document -- class and all -- is never replaced;
	 * without this, switching from a dark profile to a light one left the old
	 * theme on screen until the next hard reload.
	 *
	 * This re-runs whenever the layout's data does, which is every navigation.
	 * Toggling does not change `data`, so it does not fight the toggle.
	 */
	$: if (browser) {
		document.documentElement.classList.toggle('dark', data.profile?.darkMode ?? false);
	}
</script>

{#if data.profile}
	<Sheet.Root bind:open={sheetOpen}>
		<Sheet.Trigger asChild let:builder>
			<!--
				The logo's own ramp, via the `--chart-*` tokens, on a rounded
				square: at this size it reads as a small version of the mark
				rather than an unrelated button.
			-->
			<Button
				builders={[builder]}
				variant="ghost"
				size="icon"
				class="from-chart-from to-chart-to fixed right-4 bottom-4 z-50 h-14 w-14 rounded-xl bg-gradient-to-r text-white hover:opacity-90"
			>
				<MenuIcon class="h-14 w-14" />
			</Button>
		</Sheet.Trigger>
		<Sheet.Content side="bottom">
			<Sheet.Header>
				<Sheet.Close>
					<Sheet.Title><a href="/">hard</a></Sheet.Title>
					<Sheet.Description>Training app</Sheet.Description>
				</Sheet.Close>
			</Sheet.Header>
			<Sheet.Close class="w-full">
				<div class="grid gap-2 py-4">
					<div class="grid grid-cols-2 items-center gap-4">
						<Button href="/workouts" variant="secondary" class="h-20">Workouts</Button>
						<Button href="/exercises" variant="secondary" class="h-20">Exercises</Button>
						<Button href="/body-weight" variant="secondary" class="col-span-2 h-20"
							>Body Weight</Button
						>
					</div>
				</div>
			</Sheet.Close>
			{#if recent.length > 0}
				<Sheet.Close class="w-full">
					<div class="border-border border-t pt-3 pb-1">
						<p class="text-muted-foreground mb-2 text-left text-xs font-semibold">Recent</p>
						<div class="grid gap-2">
							{#each recent as workout (workout.objectId)}
								<Button
									href="/workouts/{workout.objectId}"
									variant="outline"
									class="w-full justify-between text-gray-400"
								>
									<span class="truncate">{workout.title}</span>
									<span class="ml-2 shrink-0 text-xs">{shortDate(workout.workoutDate)}</span>
								</Button>
							{/each}
						</div>
					</div>
				</Sheet.Close>
			{/if}
			<div class="mt-3 flex items-center gap-2">
				<form method="POST" action="/profiles?/switch" class="flex-1">
					<Button type="submit" variant="ghost" class="w-full">
						{data.profile.name} · Switch profile
					</Button>
				</form>
				<UnitToggle unit={data.profile.weightUnit} />
				<ThemeToggle darkMode={data.profile.darkMode} />
			</div>
		</Sheet.Content>
	</Sheet.Root>
{/if}

<div class="mx-4 mb-4">
	<ScrollArea>
		<slot />
	</ScrollArea>
</div>
