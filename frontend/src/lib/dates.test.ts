import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayIso } from './dates';

afterEach(() => {
	vi.useRealTimers();
});

describe('todayIso', () => {
	it('formats as YYYY-MM-DD', () => {
		expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('is the local day, not the UTC one', () => {
		// 8pm in New York on the 17th is already the 18th in UTC. A workout
		// logged then belongs to the 17th, which is the day the user is
		// living in; `toISOString()` would have said the 18th.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-18T00:30:00Z'));

		const utcDay = new Date().toISOString().slice(0, 10);
		const localDay = new Date().toLocaleDateString('en-CA');

		expect(todayIso()).toBe(localDay);

		if (localDay !== utcDay) {
			expect(todayIso()).not.toBe(utcDay);
		}
	});
});
