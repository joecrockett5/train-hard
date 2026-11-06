<script lang="ts">
	/**
	 * A profile's initials on the brand ramp.
	 *
	 * There are no uploaded avatars -- a profile is a name -- so initials are
	 * the whole of it. Two letters at most: a name of three words becomes
	 * three letters in a circle, which at 28px is a smudge.
	 */
	type Props = { name: string; size?: number; class?: string };

	let { name, size = 2, class: className = '' }: Props = $props();

	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => [...word][0] ?? '')
			.join('')
			.toUpperCase() || '?'
	);
</script>

<span
	class="avatar {className}"
	style="--size: {size}rem"
	aria-hidden="true"
	data-initials={initials}
>
	{initials}
</span>

<style>
	.avatar {
		display: grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		border-radius: var(--radius-full);
		background: var(--brand-ramp);
		color: var(--on-brand);
		font-size: calc(var(--size) * 0.4);
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1;
		user-select: none;
	}
</style>
