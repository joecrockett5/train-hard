<script lang="ts">
	import { ICONS, type IconName } from './icons';

	/**
	 * Decorative by default. An icon that is the only content of a control
	 * gets its name from the control's `aria-label`, not from here, so a
	 * screen reader is not told "plus" and then "Add exercise".
	 */
	type Props = {
		name: IconName;
		/** In `em`, so an icon tracks the text it sits beside. */
		size?: number;
		/** Set only when the icon itself carries meaning nothing else states. */
		label?: string;
		stroke?: number;
		class?: string;
	};

	let { name, size = 1.25, label, stroke = 1.7, class: className = '' }: Props = $props();
</script>

<svg
	class={className}
	viewBox="0 0 24 24"
	width="{size}em"
	height="{size}em"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : 'presentation'}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	{#if label}<title>{label}</title>{/if}
	{#each ICONS[name] as d (d)}
		<path {d} />
	{/each}
</svg>

<style>
	svg {
		flex: none;
	}
</style>
