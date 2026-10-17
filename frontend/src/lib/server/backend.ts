import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

/**
 * Calling the backend from the /api/* proxy routes.
 *
 * Each route used to inline the base URL, the profile header, the JSON
 * content type and its own error handling -- or, more often, no error
 * handling at all: most called response.json() without checking response.ok,
 * so a backend failure surfaced as a parse error or a body full of undefined
 * fields.
 */

/** A non-2xx response from the backend. */
export class BackendError extends Error {
	constructor(
		readonly status: number,
		readonly body: string
	) {
		super(`Backend responded ${status}: ${body.slice(0, 200)}`);
		this.name = 'BackendError';
	}
}

export async function callBackend(
	profileId: string,
	path: string,
	init: RequestInit & { json?: unknown } = {}
): Promise<Response> {
	const { json: payload, ...rest } = init;

	const headers: Record<string, string> = { 'X-Profile-Id': profileId };
	if (payload !== undefined) {
		headers['Content-Type'] = 'application/json';
	}

	const response = await fetch(`${env.HARD_API}${path}`, {
		...rest,
		headers: { ...headers, ...((rest.headers as Record<string, string>) ?? {}) },
		body: payload !== undefined ? JSON.stringify(payload) : rest.body
	});

	if (!response.ok) {
		throw new BackendError(response.status, await response.text());
	}

	return response;
}

export async function backendJson<T>(
	profileId: string,
	path: string,
	init: RequestInit & { json?: unknown } = {}
): Promise<T> {
	return (await callBackend(profileId, path, init)).json() as Promise<T>;
}

/**
 * Wraps a handler body: resolves the active profile, serialises the result,
 * and turns a BackendError back into the status the backend gave.
 */
export async function handle(
	locals: App.Locals,
	body: (profileId: string) => Promise<unknown>,
	status = 200
): Promise<Response> {
	const profileId = locals.profileId;

	if (!profileId) {
		return new Response('No profile selected', { status: 401 });
	}

	try {
		return json((await body(profileId)) ?? null, { status });
	} catch (error) {
		if (error instanceof BackendError) {
			return new Response(error.body, { status: error.status });
		}
		throw error;
	}
}

/** Builds a query string, omitting absent parameters. */
export function query(params: Record<string, string | null | undefined>): string {
	const search = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value) {
			search.set(key, value);
		}
	}

	return search.size ? `?${search}` : '';
}
