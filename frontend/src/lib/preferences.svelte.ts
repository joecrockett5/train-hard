import { getContext, setContext } from 'svelte';
import type { WeightUnit } from '$lib/units';
import { toast } from '$ui/toast.svelte';
import { t } from '$lib/i18n';

/**
 * The active profile, and the two preferences stored on it.
 *
 * Held in context rather than in a module-level store. The old UI used
 * module-level Svelte stores, which on the server are shared by every request
 * being rendered at once -- fine for one person on a laptop, a cross-request
 * leak the moment two profiles load a page at the same instant. A context
 * object is per component tree, so SSR renders each request with its own.
 *
 * Reads go several components deep -- a set's weight is inside an exercise
 * inside a workout -- which is why it is not threaded through as props.
 */
export type ProfileState = {
	objectId: string;
	name: string;
	darkMode: boolean;
	weightUnit: WeightUnit;
};

const KEY = Symbol('train-hard:preferences');

export class Preferences {
	objectId = $state('');
	name = $state('');
	darkMode = $state(false);
	weightUnit = $state<WeightUnit>('kg');
	/** True while a write is in flight, so a control can disable itself. */
	saving = $state(false);

	constructor(profile: ProfileState | null) {
		if (profile) {
			this.adopt(profile);
		}
	}

	/**
	 * Takes the server's copy.
	 *
	 * Called when the layout's data changes -- a navigation, a profile switch
	 * -- and only when the value actually differs, so it cannot undo a change
	 * made here: the page being rendered still carries whatever the profile
	 * said when it loaded.
	 */
	adopt(profile: ProfileState) {
		if (profile.objectId !== this.objectId) {
			this.objectId = profile.objectId;
			this.name = profile.name;
			this.darkMode = profile.darkMode;
			this.weightUnit = profile.weightUnit;
			return;
		}

		if (profile.name !== this.name && !this.saving) {
			this.name = profile.name;
		}
	}

	/**
	 * Changes a field, optimistically, and puts it back if the write fails.
	 *
	 * Optimistic because the whole point of settings that save themselves is
	 * that the screen responds at once; rolling back because a preference
	 * that appears to stick and silently did not is worse than a flicker.
	 */
	async save(changes: Partial<Pick<ProfileState, 'name' | 'darkMode' | 'weightUnit'>>) {
		const previous = {
			name: this.name,
			darkMode: this.darkMode,
			weightUnit: this.weightUnit
		};

		Object.assign(this, changes);
		this.saving = true;

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(changes)
			});

			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}

			const saved: ProfileState = await response.json();
			this.name = saved.name;
			this.darkMode = saved.darkMode;
			this.weightUnit = saved.weightUnit;

			return true;
		} catch (error) {
			console.error('Could not save the profile: ', error);
			Object.assign(this, previous);
			toast(t.errors.saveFailed, 'error');

			return false;
		} finally {
			this.saving = false;
		}
	}
}

export function providePreferences(profile: ProfileState | null): Preferences {
	return setContext(KEY, new Preferences(profile));
}

export function preferences(): Preferences {
	const found = getContext<Preferences | undefined>(KEY);

	if (!found) {
		// Only reachable by rendering a component outside the root layout,
		// which in this app means a mistake rather than a case to handle.
		throw new Error('preferences() was called outside the app layout');
	}

	return found;
}
