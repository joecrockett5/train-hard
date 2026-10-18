<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Sun from 'lucide-svelte/icons/sun';
	import Moon from 'lucide-svelte/icons/moon';

	/** The active profile's stored preference, as the server rendered it. */
	export let darkMode: boolean;

	let saving = false;

	/**
	 * Flips the theme straight away and persists it afterwards.
	 *
	 * The class on <html> is what Tailwind's `darkMode: ['class']` reads, and
	 * the server already put it there for this page load; toggling it here
	 * rather than waiting for the round trip is what makes the switch feel
	 * instant. If the write fails the class goes back, so what is on screen
	 * never disagrees with what is stored.
	 */
	async function toggle() {
		const next = !darkMode;

		darkMode = next;
		document.documentElement.classList.toggle('dark', next);
		saving = true;

		try {
			const response = await fetch('/api/theme', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ darkMode: next })
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
		} catch (error) {
			console.error('Failed to save the theme: ', error);
			darkMode = !next;
			document.documentElement.classList.toggle('dark', !next);
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
	aria-pressed={darkMode}
	aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
	title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if darkMode}
		<Sun class="h-5 w-5" />
	{:else}
		<Moon class="h-5 w-5" />
	{/if}
</Button>
