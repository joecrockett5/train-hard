import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compile, preprocess } from 'svelte/compiler';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Guards the trap that silently broke every pager in the app.
 *
 * Svelte 4 treats a variable assigned by a reactive statement as owned by
 * that statement: when anything else writes the variable -- a `bind:` from a
 * child, say -- the compiler invalidates the statement's dependencies too, so
 * the statement re-runs and re-derives its value. A page that reset the pager
 * with
 *
 *     $: if (selectedTagIds) { page = 1; }
 *
 * therefore re-ran that block on every click of the pager, because the click
 * writes `page` through `bind:page`. The condition is an always-truthy array,
 * so each click on page 2 went straight back to page 1 and the pager looked
 * dead. The fix is to reset the page from the event that changes the filter;
 * nothing may assign the paged variable from a `$:` block.
 *
 * The check reads that off the compiled component: a binding function that
 * only writes `page` compiles to a single `$$invalidate`, while one whose
 * variable is also assigned reactively carries an `$$invalidate` for each
 * dependency the compiler has decided to drag along.
 */

const ROUTES = 'src/routes';

/** Every route component that binds a page number to a `<Pager>`. */
function pagedRoutes(directory: string = ROUTES): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			return pagedRoutes(path);
		}

		if (!entry.name.endsWith('.svelte')) {
			return [];
		}

		return readFileSync(path, 'utf8').includes('bind:page') ? [path] : [];
	});
}

/**
 * The binding functions the compiler wrote into the instance body.
 *
 * Each `<Pager bind:page>` also produces a one-line forwarder inside its
 * fragment; those hold no `$$invalidate` and are not what this is about.
 */
function pageBindings(code: string): string[] {
	return (code.match(/function \w*page_binding\w*\(value\) \{[^}]*\}/g) ?? []).filter((body) =>
		body.includes('$$invalidate')
	);
}

describe('a page number bound to the pager', () => {
	const routes = pagedRoutes();

	it('is bound somewhere, or this suite is checking nothing', () => {
		expect(routes.length).toBeGreaterThan(0);
	});

	it.each(routes)('is not assigned by a reactive statement in %s', async (filename) => {
		const source = readFileSync(filename, 'utf8');
		const processed = await preprocess(source, vitePreprocess(), { filename });
		const { js } = compile(processed.code, { filename, generate: 'dom', dev: false });

		const bindings = pageBindings(js.code);
		expect(bindings.length).toBeGreaterThan(0);

		for (const binding of bindings) {
			expect(binding.match(/\$\$invalidate\(/g)).toHaveLength(1);
		}
	});
});
