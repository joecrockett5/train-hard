import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compile, preprocess } from 'svelte/compiler';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * The same trap `pager-binding.test.ts` guards, on the weight boxes.
 *
 * Svelte 4 treats a variable assigned by a reactive statement as owned by
 * that statement, and re-runs the statement whenever anything else writes the
 * variable -- a `bind:` from a child included. A weight that is both bound to
 * an input and derived with
 *
 *     $: weight = nextWorkingWeight(sets, lastSession, unit);
 *
 * is therefore re-derived on every keystroke, and the box cannot be typed
 * into: each digit is replaced by the suggestion before it lands. The number
 * still has to follow the sets, so the derivation stays -- it just assigns
 * from inside a function, which the compiler does not trace.
 *
 * Read off the compiled component, as the pager check is: a binding that only
 * writes its variable compiles to a single `$$invalidate`, while one the
 * compiler has decided to drag dependencies along with carries several.
 */

const COMPONENTS = 'src/lib';

/** Every component that binds a weight to an input. */
function weightBindingComponents(directory: string = COMPONENTS): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			return weightBindingComponents(path);
		}

		if (!entry.name.endsWith('.svelte')) {
			return [];
		}

		return /bind:weight[=\s/>]/.test(readFileSync(path, 'utf8')) ? [path] : [];
	});
}

/**
 * The binding functions the compiler wrote into the instance body.
 *
 * Each `bind:weight` also produces a one-line forwarder inside its fragment;
 * those hold no `$$invalidate` and are not what this is about.
 */
function weightBindings(code: string): string[] {
	return (code.match(/function \w*weight_binding\w*\(value\) \{[^}]*\}/g) ?? []).filter((body) =>
		body.includes('$$invalidate')
	);
}

describe('a weight bound to a set dialog', () => {
	const components = weightBindingComponents();

	it('is bound somewhere, or this suite is checking nothing', () => {
		expect(components.length).toBeGreaterThan(0);
	});

	it.each(components)('is not assigned by a reactive statement in %s', async (filename) => {
		const source = readFileSync(filename, 'utf8');
		const processed = await preprocess(source, vitePreprocess(), { filename });
		const { js } = compile(processed.code, { filename, generate: 'dom', dev: false });

		const bindings = weightBindings(js.code);
		expect(bindings.length).toBeGreaterThan(0);

		for (const binding of bindings) {
			expect(binding.match(/\$\$invalidate\(/g)).toHaveLength(1);
		}
	});
});
