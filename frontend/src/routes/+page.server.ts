import type { PageServerLoad } from './$types';

/**
 * The weigh-ins behind the home page's summary.
 *
 * A failure here degrades to a widget that says so rather than a 500 for the
 * whole page: this is the landing page, and a backend still starting up
 * should not make the app look broken. The distinction matters because the
 * widget's empty state reads "no weigh-ins yet", which would be a lie if the
 * truth is that we could not ask.
 */
export const load = (async ({ fetch }) => {
	// Templates fail quietly to an empty list: with none to offer, the dialog
	// says so, which is the same thing a profile without any sees.
	const templates = fetch('/api/templates')
		.then((response) => (response.ok ? response.json() : []))
		.catch(() => []);

	try {
		const response = await fetch(`/api/body-weights`);

		if (!response.ok) {
			return { bodyWeights: [], weightsUnavailable: true, templates: await templates };
		}

		return {
			bodyWeights: await response.json(),
			weightsUnavailable: false,
			templates: await templates
		};
	} catch {
		return { bodyWeights: [], weightsUnavailable: true, templates: await templates };
	}
}) satisfies PageServerLoad;
