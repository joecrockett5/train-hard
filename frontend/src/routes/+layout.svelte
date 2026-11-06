<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toaster from '$ui/Toaster.svelte';
	import { providePreferences } from '$lib/preferences.svelte';
	import { setLocale, t } from '$lib/i18n';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	/*
	 * Before anything renders, so the first component to read a string gets
	 * the right catalogue. On the server the locale is already set from the
	 * environment; this is what carries it across to the browser.
	 */
	// svelte-ignore state_referenced_locally
	setLocale(data.locale);

	// The profile the page was served with; the effect below keeps it current.
	// svelte-ignore state_referenced_locally
	const prefs = providePreferences(data.profile);

	// A navigation, or a profile switch, brings the server's copy over. The
	// object decides whether to take it; see Preferences.adopt.
	$effect(() => {
		if (data.profile) {
			prefs.adopt(data.profile);
		}
	});

	/**
	 * Keeps the theme on <html> in step with the active profile.
	 *
	 * hooks.server.ts puts it there so the first paint is right, but that
	 * only happens for a full document load. The profile picker submits with
	 * `use:enhance`, so choosing a profile is a client-side navigation and the
	 * document -- attribute and all -- is never replaced; without this,
	 * switching from a dark profile to a light one left the old theme on
	 * screen until the next hard reload.
	 */
	$effect(() => {
		if (!browser) {
			return;
		}

		const theme = prefs.darkMode ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', theme === 'dark' ? '#14110f' : '#fbfaf9');
	});

	/**
	 * Every screen opens at the top.
	 *
	 * SvelteKit already does this for a plain link, but not for back and
	 * forward, where it restores the old position, and not for a `goto` to
	 * the route you are already on -- which is how a page reloads itself
	 * after a delete, landing you mid-list.
	 */
	afterNavigate(() => {
		window.scrollTo(0, 0);
	});
</script>

<a href="#main" class="skip">{t.nav.skipToContent}</a>

{#if data.profile}
	<Navigation />
{/if}

<div class="shell" class:gated={!data.profile}>
	<main id="main" tabindex="-1">
		{@render children()}
	</main>
</div>

<Toaster />

<style>
	.skip {
		position: fixed;
		top: var(--space-2);
		left: var(--space-2);
		z-index: 100;
		padding: var(--space-2) var(--space-4);
		background: var(--surface-overlay);
		border: 1px solid var(--brand);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		transform: translateY(-200%);
	}

	.skip:focus {
		transform: none;
	}

	main {
		width: 100%;
		max-width: var(--column);
		margin-inline: auto;
		padding: var(--space-4) var(--gutter)
			calc(var(--tab-bar) + env(safe-area-inset-bottom) + var(--space-8));
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	main:focus {
		outline: none;
	}

	/* No navigation on the picker, so the column centres on the screen. */
	.gated main {
		max-width: 26rem;
		padding-bottom: var(--space-8);
		min-height: 100svh;
		justify-content: center;
	}

	@media (min-width: 52rem) {
		.shell {
			padding-left: var(--rail);
		}

		.shell.gated {
			padding-left: 0;
		}

		main {
			max-width: var(--wide-column);
			padding: var(--space-6) var(--space-6) var(--space-10);
			gap: var(--space-5);
		}
	}
</style>
