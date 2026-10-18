<script lang="ts">
	/**
	 * The nav sheet's glyph.
	 *
	 * Was `red-plus.svelte`, which drew its own red disc behind these bars and
	 * was named for neither what it is nor what it depicts. The shape and
	 * colour now belong to the button, so this is only the mark, in
	 * `currentColor`, sized by the caller.
	 */
	let className: string = 'h-7 w-7';
	export { className as class };
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 256 256"
	class={className}
	fill="none"
	aria-hidden="true"
>
	<g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
		<path
			fill-rule="evenodd"
			clip-rule="evenodd"
			d="M4 5C3.44772 5 3 5.44772 3 6C3 6.55228 3.44772 7 4 7H20C20.5523 7 21 6.55228 21 6C21 5.44772 20.5523 5 20 5H4ZM7 12C7 11.4477 7.44772 11 8 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H8C7.44772 13 7 12.5523 7 12ZM13 18C13 17.4477 13.4477 17 14 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H14C13.4477 19 13 18.5523 13 18Z"
			transform="translate(12 16) scale(2.5)"
			fill="currentColor"
		/>
	</g>
</svg>
