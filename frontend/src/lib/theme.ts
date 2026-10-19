/**
 * Whether the app is showing its dark palette.
 *
 * A store for the same reason `weightUnit` is one: the nav sheet rebuilds
 * its contents each time it opens, so a toggle holding the value as a prop
 * captured whatever the profile said when the page loaded and went stale the
 * moment it was used. The store is the live value, and the layout applies it
 * to the `dark` class on <html>.
 */

import { writable } from 'svelte/store';

export const darkMode = writable(false);
