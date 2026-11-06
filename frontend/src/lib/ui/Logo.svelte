<script lang="ts">
	import { t } from '$lib/i18n';

	/**
	 * The mark, inline.
	 *
	 * Inline rather than an `<img>` so the wordmark inherits `currentColor`
	 * and reads in both themes, and so the ramp is one gradient rather than a
	 * second network request on the first screen anybody sees.
	 *
	 * The gradient id is per-instance: two copies of this on one page with the
	 * same id leaves the second referencing the first one's def, which breaks
	 * the moment the first is removed from the DOM.
	 */
	type Props = {
		/** With the wordmark, or the square mark alone. */
		lockup?: boolean;
		/** Height in `rem`. */
		size?: number;
		class?: string;
	};

	let { lockup = false, size = 2, class: className = '' }: Props = $props();

	const id = $props.id();
</script>

<svg
	class={className}
	viewBox={lockup ? '0 0 236 64' : '0 0 64 64'}
	height="{size}rem"
	width={lockup ? `${size * (236 / 64)}rem` : `${size}rem`}
	role="img"
	aria-label={t.app.name}
>
	<title>{t.app.name}</title>
	<defs>
		<linearGradient id="ramp-{id}" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="var(--brand-from)" />
			<stop offset="1" stop-color="var(--brand-to)" />
		</linearGradient>
	</defs>
	<rect width="64" height="64" rx="15" fill="url(#ramp-{id})" />
	<path
		d="M12 46 L24 31 L34 40 L50 16"
		fill="none"
		stroke="var(--on-brand)"
		stroke-width="7"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<circle cx="50" cy="16" r="6" fill="var(--on-brand)" />
	{#if lockup}
		<text x="80" y="42" font-size="31" letter-spacing="-1" fill="currentColor">
			<tspan font-weight="500" opacity="0.62">train</tspan><tspan font-weight="800">hard</tspan>
		</text>
	{/if}
</svg>

<style>
	text {
		font-family: var(--font-sans);
	}
</style>
