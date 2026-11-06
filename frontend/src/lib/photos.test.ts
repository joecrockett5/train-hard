import { describe, expect, it } from 'vitest';
import { fittedSize, MAX_EDGE } from './photos';

describe('fittedSize', () => {
	it('leaves an image that is already small enough alone', () => {
		// Scaling up would invent detail and cost bytes.
		expect(fittedSize(800, 600)).toEqual({ width: 800, height: 600 });
	});

	it('caps the long edge and keeps the aspect ratio', () => {
		expect(fittedSize(4000, 3000)).toEqual({ width: MAX_EDGE, height: 1200 });
	});

	it('caps the long edge when the image is portrait, which a phone photo is', () => {
		expect(fittedSize(3000, 4000)).toEqual({ width: 1200, height: MAX_EDGE });
	});

	it('never rounds an edge away to nothing', () => {
		// A 4000x3 strip scales to 1600x1.2, and Math.round would make that 1
		// -- but anything narrower would round to zero and encode nothing.
		expect(fittedSize(8000, 3)).toEqual({ width: MAX_EDGE, height: 1 });
	});

	it('is unbothered by a zero-sized image rather than dividing by it', () => {
		expect(fittedSize(0, 0)).toEqual({ width: 0, height: 0 });
	});

	it('takes the cap as an argument, so a thumbnail can ask for a smaller one', () => {
		expect(fittedSize(4000, 2000, 400)).toEqual({ width: 400, height: 200 });
	});
});
