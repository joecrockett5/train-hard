<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { type Variant, badgeVariants } from './index.js';
	import { cn } from '$lib/utils.js';

	let className: string | undefined | null = undefined;
	export { className as class };
	export let href: HTMLAnchorAttributes['href'] = undefined;
	export let variant: Variant = 'default';
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	{href}
	class={cn(badgeVariants({ variant, className }))}
	{...$$restProps}
>
	<slot />
</svelte:element>
