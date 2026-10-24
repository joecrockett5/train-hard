import type { ProgressPhoto } from '$lib/types';

/**
 * Getting a progress photo from a phone to the server.
 *
 * A photo off a modern phone is three to five megabytes, which is far more
 * than this ever displays: the largest it is shown is a dialog on a handset.
 * Shrinking before the upload keeps a year of weekly photos in the tens of
 * megabytes rather than the gigabytes, and makes them load over a phone
 * connection in a gym.
 */

/** The longest edge a stored photo is allowed, in pixels. */
export const MAX_EDGE = 1600;

/** How hard the JPEG is squeezed. High enough that the seams do not show. */
const JPEG_QUALITY = 0.82;

/**
 * The size an image becomes once its long edge is capped.
 *
 * Aspect ratio is kept, and an image already small enough is left alone --
 * scaling it up would invent detail and cost bytes.
 */
export function fittedSize(
	width: number,
	height: number,
	maxEdge: number = MAX_EDGE
): { width: number; height: number } {
	const longest = Math.max(width, height);

	if (longest <= maxEdge || longest === 0) {
		return { width, height };
	}

	const scale = maxEdge / longest;

	// Rounded, and never to zero: a 4000x3 panorama would otherwise end up
	// with no height at all.
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

type Shrunk = { blob: Blob; width: number; height: number };

/**
 * Decodes, resizes and re-encodes one chosen file as a JPEG.
 *
 * Drawn from an `<img>` rather than an `ImageBitmap` because browsers apply
 * the EXIF orientation tag to an image element by default, and a phone
 * holding its camera upright writes that tag rather than rotating the
 * pixels. Taking the bitmap route instead stores portrait photos on their
 * side.
 */
export async function shrinkImage(file: File, maxEdge: number = MAX_EDGE): Promise<Shrunk> {
	const url = URL.createObjectURL(file);

	try {
		const image = new Image();
		image.src = url;
		await image.decode();

		const { width, height } = fittedSize(image.naturalWidth, image.naturalHeight, maxEdge);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext('2d');

		if (!context) {
			throw new Error('Could not get a 2d canvas context');
		}

		context.drawImage(image, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
		);

		if (!blob) {
			throw new Error('Could not encode the resized image');
		}

		return { blob, width, height };
	} finally {
		URL.revokeObjectURL(url);
	}
}

/** Shrinks one file and uploads it against a weigh-in. */
export async function uploadPhoto(
	file: File,
	bodyWeightId: string,
	fetcher: typeof fetch = fetch
): Promise<ProgressPhoto> {
	const { blob, width, height } = await shrinkImage(file);

	const response = await fetcher(
		`/api/progress-photos?bodyWeight=${bodyWeightId}&width=${width}&height=${height}`,
		{ method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob }
	);

	if (!response.ok) {
		throw new Error(`Upload failed: ${response.status}`);
	}

	return response.json();
}

/**
 * Uploads several, and reports what landed.
 *
 * One failure does not abandon the rest: having picked four photos, three of
 * them stored beats none, and the weigh-in they belong to already exists by
 * this point either way.
 */
export async function uploadPhotos(
	files: File[],
	bodyWeightId: string,
	fetcher: typeof fetch = fetch
): Promise<ProgressPhoto[]> {
	const uploaded: ProgressPhoto[] = [];

	for (const file of files) {
		try {
			uploaded.push(await uploadPhoto(file, bodyWeightId, fetcher));
		} catch (error) {
			console.error(`Could not upload '${file.name}': `, error);
		}
	}

	return uploaded;
}
