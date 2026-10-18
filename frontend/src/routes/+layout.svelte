<script lang="ts">
	import '../app.css';

	import { browser } from '$app/environment';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import MenuIcon from '$lib/svg/menu-icon.svelte';
	import ThemeToggle from '$lib/hard-components/theme-toggle.svelte';

	export let data;

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
	<Sheet.Root>
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
			<div class="flex items-center gap-2">
				<form method="POST" action="/profiles?/switch" class="flex-1">
					<Button type="submit" variant="ghost" class="w-full">
						{data.profile.name} · Switch profile
					</Button>
				</form>
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
