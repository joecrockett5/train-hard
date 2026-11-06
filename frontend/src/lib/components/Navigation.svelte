<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$ui/Icon.svelte';
	import type { IconName } from '$ui/icons';
	import Logo from '$ui/Logo.svelte';
	import Avatar from './Avatar.svelte';
	import { t } from '$lib/i18n';
	import { preferences } from '$lib/preferences.svelte';

	/**
	 * One list of destinations, rendered twice.
	 *
	 * A bottom tab bar on a phone, which is where a thumb is, and a side rail
	 * from tablet width up. Both come from the same array so the two cannot
	 * drift, and only one is in the layout at a time -- CSS decides which.
	 *
	 * The old UI had a single floating button in the bottom-right corner
	 * opening a sheet that held navigation, recent workouts, profile
	 * switching and two preference toggles. This is only navigation; the
	 * profile and its settings are the avatar, which is where a person looks
	 * for them.
	 */
	const prefs = preferences();

	type Destination = { href: string; label: string; icon: IconName };

	const destinations: Destination[] = [
		{ href: '/', label: t.nav.dashboard, icon: 'home' },
		{ href: '/workouts', label: t.nav.workouts, icon: 'dumbbell' },
		{ href: '/exercises', label: t.nav.exercises, icon: 'list' },
		{ href: '/templates', label: t.nav.templates, icon: 'bookmark' },
		{ href: '/body-weight', label: t.nav.bodyWeight, icon: 'chartLine' }
	];

	/** `/` only matches itself; everything else matches its subtree. */
	function current(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
	}
</script>

<!-- Phone: a top bar for identity and the profile, a tab bar for going places. -->
<header class="appbar">
	<a href="/" class="wordmark" aria-label={t.app.name}>
		<Logo lockup size={1.6} />
	</a>
	<a
		href="/settings"
		class="profile"
		class:active={current('/settings')}
		aria-label={t.nav.openSettings(prefs.name)}
		aria-current={current('/settings') ? 'page' : undefined}
	>
		<Avatar name={prefs.name} size={2} />
	</a>
</header>

<nav class="tabbar" aria-label={t.nav.primary}>
	{#each destinations as destination (destination.href)}
		<a
			href={destination.href}
			class="tab"
			class:active={current(destination.href)}
			aria-current={current(destination.href) ? 'page' : undefined}
		>
			<Icon name={destination.icon} size={1.3} />
			<span>{destination.label}</span>
		</a>
	{/each}
</nav>

<!-- Tablet and up: one rail, with the profile at the foot of it. -->
<nav class="rail" aria-label={t.nav.primary}>
	<a href="/" class="rail-wordmark" aria-label={t.app.name}>
		<Logo lockup size={1.9} />
	</a>

	<ul>
		{#each destinations as destination (destination.href)}
			<li>
				<a
					href={destination.href}
					class="rail-link"
					class:active={current(destination.href)}
					aria-current={current(destination.href) ? 'page' : undefined}
				>
					<Icon name={destination.icon} size={1.25} />
					<span>{destination.label}</span>
				</a>
			</li>
		{/each}
	</ul>

	<a
		href="/settings"
		class="rail-profile"
		class:active={current('/settings')}
		aria-current={current('/settings') ? 'page' : undefined}
	>
		<Avatar name={prefs.name} size={2.1} />
		<span class="who">
			<strong>{prefs.name}</strong>
			<small>{t.settings.title}</small>
		</span>
		<Icon name="chevronRight" size={1.05} />
	</a>
</nav>

<style>
	/* ---- phone ----------------------------------------------------------- */

	.appbar {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		height: calc(var(--app-bar) + env(safe-area-inset-top));
		padding: env(safe-area-inset-top) var(--gutter) 0;
		background: color-mix(in srgb, var(--surface) 86%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--line);
	}

	.wordmark {
		display: flex;
		align-items: center;
		/* The logo is short; the target around it is not. */
		min-height: var(--touch);
		color: var(--ink);
	}

	.profile {
		display: grid;
		place-items: center;
		min-width: var(--touch);
		min-height: var(--touch);
		border-radius: var(--radius-full);
	}

	.profile.active {
		box-shadow: 0 0 0 2px var(--brand);
	}

	.tabbar {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 30;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		padding-bottom: env(safe-area-inset-bottom);
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--line);
	}

	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: var(--tab-bar);
		padding: var(--space-1) var(--space-1);
		color: var(--ink-subtle);
		font-size: var(--text-2xs);
		font-weight: 600;
		transition: color var(--dur-fast) var(--ease);
	}

	.tab span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tab:hover {
		color: var(--ink-muted);
	}

	.tab.active {
		color: var(--brand);
	}

	/*
	 * The active tab is marked by a bar as well as by colour, so the state is
	 * not carried by hue alone.
	 */
	.tab.active::before {
		content: '';
		position: absolute;
		margin-top: calc(-1 * var(--space-1) - 2px);
		width: 1.75rem;
		height: 3px;
		border-radius: var(--radius-full);
		background: var(--brand-ramp);
	}

	.rail {
		display: none;
	}

	/* ---- tablet and up --------------------------------------------------- */

	@media (min-width: 52rem) {
		.appbar,
		.tabbar {
			display: none;
		}

		.rail {
			position: fixed;
			inset: 0 auto 0 0;
			z-index: 30;
			display: flex;
			flex-direction: column;
			gap: var(--space-5);
			width: var(--rail);
			padding: var(--space-5) var(--space-4);
			background: var(--surface);
			border-right: 1px solid var(--line);
		}

		.rail-wordmark {
			display: flex;
			align-items: center;
			min-height: var(--touch);
			padding-inline: var(--space-2);
			color: var(--ink);
		}

		.rail ul {
			display: flex;
			flex-direction: column;
			gap: var(--space-1);
		}

		.rail-link {
			display: flex;
			align-items: center;
			gap: var(--space-3);
			min-height: var(--touch);
			padding: 0 var(--space-3);
			border-radius: var(--radius-md);
			color: var(--ink-muted);
			font-size: var(--text-sm);
			font-weight: 600;
			transition:
				background-color var(--dur-fast) var(--ease),
				color var(--dur-fast) var(--ease);
		}

		.rail-link:hover {
			background: var(--surface-hover);
			color: var(--ink);
		}

		.rail-link.active {
			background: var(--brand-wash);
			color: var(--brand);
		}

		.rail-profile {
			display: flex;
			align-items: center;
			gap: var(--space-3);
			margin-top: auto;
			min-height: var(--touch);
			padding: var(--space-2);
			border: 1px solid var(--line);
			border-radius: var(--radius-lg);
			color: var(--ink-muted);
			transition: border-color var(--dur-fast) var(--ease);
		}

		.rail-profile:hover,
		.rail-profile.active {
			border-color: var(--brand);
		}

		.who {
			display: flex;
			flex-direction: column;
			min-width: 0;
			line-height: 1.25;
		}

		.who strong {
			font-size: var(--text-sm);
			color: var(--ink);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.who small {
			font-size: var(--text-xs);
			color: var(--ink-subtle);
		}

		.rail-profile :global(svg:last-child) {
			margin-left: auto;
		}
	}
</style>
