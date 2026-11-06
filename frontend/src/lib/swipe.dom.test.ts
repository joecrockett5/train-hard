import { beforeEach, describe, expect, it, vi } from 'vitest';
import { swipe } from './swipe';

/**
 * The gesture that moves the workouts screen a day at a time.
 *
 * Runs under jsdom -- `vitest.config.ts` gives `*.dom.test.ts` a DOM -- and
 * drives the handler with pointer events rather than rendering a component,
 * because what is worth testing here is which drags count as a swipe.
 */

function pointer(type: string, x: number, y: number, target: Element) {
	const event = new MouseEvent(type, {
		bubbles: true,
		clientX: x,
		clientY: y,
		button: 0
	});

	target.dispatchEvent(event);
	return event;
}

describe('swipe', () => {
	let node: HTMLElement;
	let link: HTMLAnchorElement;
	let field: HTMLInputElement;
	let onswipe: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		document.body.innerHTML = '';
		node = document.createElement('div');
		link = document.createElement('a');
		link.href = '/workouts/1';
		field = document.createElement('input');
		node.append(link, field);
		document.body.append(node);

		onswipe = vi.fn();
		swipe(node, { onswipe });
	});

	function drag(
		from: number,
		to: number,
		{ y = 0, target }: { y?: number; target?: Element } = {}
	) {
		target = target ?? link;
		pointer('pointerdown', from, 0, target);
		pointer('pointerup', to, y, target);
	}

	it('reports a leftward swipe as left', () => {
		drag(300, 100);

		expect(onswipe).toHaveBeenCalledWith('left');
	});

	it('reports a rightward swipe as right', () => {
		drag(100, 300);

		expect(onswipe).toHaveBeenCalledWith('right');
	});

	it('ignores a drag too short to be deliberate', () => {
		drag(100, 140);

		expect(onswipe).not.toHaveBeenCalled();
	});

	it('ignores a drag that travelled further down than sideways', () => {
		// The page scrolls; a swipe that steals a scroll is much worse than
		// one that does not fire.
		drag(300, 200, { y: 200 });

		expect(onswipe).not.toHaveBeenCalled();
	});

	it('works when it starts on a card, which the list is made of', () => {
		// Excluding links left the gesture working only in the gaps between
		// the cards it is meant to be performed over.
		drag(300, 100, { target: link });

		expect(onswipe).toHaveBeenCalledWith('left');
	});

	it('swallows the click that swiping across a card would otherwise fire', () => {
		drag(300, 100, { target: link });

		const click = new MouseEvent('click', { bubbles: true, cancelable: true });
		link.dispatchEvent(click);

		expect(click.defaultPrevented).toBe(true);
	});

	it('swallows only that one click, not the next real tap', () => {
		drag(300, 100, { target: link });
		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		const later = new MouseEvent('click', { bubbles: true, cancelable: true });
		link.dispatchEvent(later);

		expect(later.defaultPrevented).toBe(false);
	});

	it('leaves a text field alone, where dragging sideways selects text', () => {
		drag(300, 100, { target: field });

		expect(onswipe).not.toHaveBeenCalled();
	});

	it('stops listening once destroyed', () => {
		const other = document.createElement('div');
		document.body.append(other);
		const handle = swipe(other, { onswipe });
		handle.destroy();

		pointer('pointerdown', 300, 0, other);
		pointer('pointerup', 100, 0, other);

		expect(onswipe).not.toHaveBeenCalled();
	});
});
