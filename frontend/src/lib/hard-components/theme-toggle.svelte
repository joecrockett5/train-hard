<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Sun from 'lucide-svelte/icons/sun';
	import Moon from 'lucide-svelte/icons/moon';
	import { darkMode } from '$lib/theme';

	/**
	 * Read from the store, not taken as a prop.
	 *
	 * The nav sheet rebuilds its contents each time it opens, so a prop held
	 * the profile's value as the page was loaded: after toggling once, the
	 * button went back to offering "switch to dark mode" on a page that was
	 * already dark.
	 */
	let saving = false;

	/**
	 * Flips the theme straight away and persists it afterwards.
	 *
	 * The layout puts the `dark` class on <html> from this store, so setting
	 * it is all that is needed and the switch is instant. If the write fails
	 * the store goes back, so what is on screen never disagrees with what is
	 * stored.
	 */
	async function toggle() {
		const previous = $darkMode;
		const next = !previous;

		darkMode.set(next);
		saving = true;

		try {
			const response = await fetch('/api/preferences', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ darkMode: next })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
		} catch (error) {
			console.error('Failed to save the theme: ', error);
			darkMode.set(previous);
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
	aria-pressed={$darkMode}
	aria-label={$darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
	title={$darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if $darkMode}
		<Sun class="h-5 w-5" />
	{:else}
		<Moon class="h-5 w-5" />
	{/if}
</Button>
