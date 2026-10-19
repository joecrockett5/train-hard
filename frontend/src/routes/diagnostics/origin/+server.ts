import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';

/**
 * What the server thinks it is being served as, and why.
 *
 * A 403 "Cross-site POST form submissions are forbidden" means the origin
 * the server computed does not match the `Origin` the browser sent, and
 * neither is visible from the outside -- which makes the failure very hard
 * to tell apart from a dozen other causes. This reports both, and the inputs
 * that produced them.
 *
 * Reachable without a profile selected (see `UNGATED` in hooks.server.ts),
 * because the form that fails is the profile picker itself.
 *
 * It echoes a handful of routing headers back to whoever sent them and names
 * the two header settings. Nothing here is a secret, and the alternative is
 * diagnosing a proxy by guesswork.
 */
export const GET: RequestHandler = ({ request, url }) => {
	const configuredOrigin = env.ORIGIN ?? '';
	const protocolHeader = (env.PROTOCOL_HEADER ?? '').toLowerCase();
	const hostHeader = (env.HOST_HEADER ?? 'host').toLowerCase();

	const sentOrigin = request.headers.get('origin');

	// `url.origin` is what adapter-node resolved for this request, and what
	// the CSRF check compares the browser's Origin against.
	const resolvedOrigin = url.origin;

	return json({
		resolvedOrigin,
		sentOrigin,
		matches: sentOrigin === null ? null : sentOrigin === resolvedOrigin,
		usingFixedOrigin: configuredOrigin !== '',
		config: {
			ORIGIN: configuredOrigin || '(blank: derived from the headers below)',
			PROTOCOL_HEADER: protocolHeader || '(unset: assumes https)',
			HOST_HEADER: hostHeader
		},
		headersReceived: {
			host: request.headers.get('host'),
			'x-forwarded-host': request.headers.get('x-forwarded-host'),
			'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
			'x-forwarded-scheme': request.headers.get('x-forwarded-scheme'),
			'x-forwarded-port': request.headers.get('x-forwarded-port')
		},
		// The one the derivation actually reads, which is the usual mistake.
		hostHeaderValue: request.headers.get(hostHeader)
	});
};
