/**
 * Horizontal swipes, for paging a day at a time.
 *
 * A Svelte action rather than a gesture library: this is the only gesture in
 * the app, and the whole of it is "did a pointer travel far enough sideways,
 * fast enough, without travelling up or down".
 *
 * Pointer events rather than touch events, so it works with a trackpad and a
 * stylus as well as a thumb. Vertical movement wins ties, because the page
 * scrolls and a swipe that steals a scroll is much more annoying than one
 * that does not fire.
 */

export type SwipeOptions = {
	onswipe: (direction: 'left' | 'right') => void;
	/** How far it has to travel, in pixels. */
	threshold?: number;
	/** How long it may take, in milliseconds. */
	timeout?: number;
};

export function swipe(node: HTMLElement, options: SwipeOptions) {
	let current = options;
	let startX = 0;
	let startY = 0;
	let startedAt = 0;
	let tracking = false;

	function down(event: PointerEvent) {
		// Not a secondary button, and not a drag started on a control.
		if (event.button !== 0 || (event.target as HTMLElement).closest('button, a, input, select')) {
			tracking = false;
			return;
		}

		tracking = true;
		startX = event.clientX;
		startY = event.clientY;
		startedAt = event.timeStamp;
	}

	function up(event: PointerEvent) {
		if (!tracking) {
			return;
		}
		tracking = false;

		const dx = event.clientX - startX;
		const dy = event.clientY - startY;
		const threshold = current.threshold ?? 60;

		if (event.timeStamp - startedAt > (current.timeout ?? 600)) {
			return;
		}

		if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) {
			return;
		}

		current.onswipe(dx < 0 ? 'left' : 'right');
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', () => (tracking = false));

	return {
		update(next: SwipeOptions) {
			current = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
		}
	};
}
