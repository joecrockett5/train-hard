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
	let swallowClick = false;

	function down(event: PointerEvent) {
		/*
		 * Links and buttons are *not* excluded. The list being swiped is made
		 * of cards, each of which is a link, so excluding them left the
		 * gesture working only in the gaps between them. A swipe needs real
		 * travel, which a tap does not have, and the click it would otherwise
		 * also fire is swallowed below.
		 *
		 * Text fields are excluded: dragging sideways in one selects text,
		 * and that has to keep working.
		 */
		if (event.button !== 0 || (event.target as HTMLElement).closest('input, select, textarea')) {
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

		// The pointer went down on a card and came up somewhere else, so the
		// browser is about to follow that card's link. It was a swipe.
		swallowClick = true;

		current.onswipe(dx < 0 ? 'left' : 'right');
	}

	/** Swallows exactly one click, the one this swipe is about to produce. */
	function click(event: MouseEvent) {
		if (!swallowClick) {
			return;
		}

		swallowClick = false;
		event.preventDefault();
		event.stopPropagation();
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', () => (tracking = false));
	// Capture, so it runs before the link's own handling.
	node.addEventListener('click', click, true);

	return {
		update(next: SwipeOptions) {
			current = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('click', click, true);
		}
	};
}
