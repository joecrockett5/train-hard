/**
 * Transient confirmations.
 *
 * Settings save as you change them, with no Save button, so something has to
 * say that the change landed -- otherwise flipping a switch and seeing
 * nothing happen is indistinguishable from flipping a switch that failed.
 */

export type Toast = {
	id: number;
	message: string;
	tone: 'info' | 'error';
};

let next = 0;

export const toasts = $state<{ items: Toast[] }>({ items: [] });

/** How long a confirmation stays up. Long enough to read, short enough to ignore. */
const LIFETIME = 2600;

export function toast(message: string, tone: Toast['tone'] = 'info'): void {
	const id = next++;

	toasts.items = [...toasts.items, { id, message, tone }];

	setTimeout(() => dismissToast(id), tone === 'error' ? LIFETIME * 2 : LIFETIME);
}

export function dismissToast(id: number): void {
	toasts.items = toasts.items.filter((each) => each.id !== id);
}
