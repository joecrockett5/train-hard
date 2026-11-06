/**
 * Renders the PNG icon set from the brand SVGs.
 *
 * The SVGs in static/brand are the source of truth; these PNGs exist only
 * because operating systems still want raster for a Home Screen tile. Run
 * this after changing the mark:
 *
 *   node scripts/render-icons.mjs
 *
 * It needs Playwright's Chromium, which is why it is a script run by hand
 * rather than a build step -- the production image has no browser in it and
 * should not grow one to redraw an icon that changes once a year.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Required rather than imported: Playwright may be a local devDependency or
 * it may be installed globally and found through NODE_PATH, and only CommonJS
 * resolution consults NODE_PATH.
 */
const { chromium } = createRequire(import.meta.url)('playwright');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = join(root, 'static');

/** `transparent` keeps the squircle's corners clear; the rest are full bleed. */
const TARGETS = [
	{ source: 'favicon.svg', out: 'favicon.png', size: 32, transparent: true },
	{ source: 'brand/logo-mark.svg', out: 'icon-192.png', size: 192, transparent: true },
	{ source: 'brand/logo-mark.svg', out: 'icon-512.png', size: 512, transparent: true },
	{ source: 'brand/icon-maskable.svg', out: 'icon-maskable-192.png', size: 192 },
	{ source: 'brand/icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
	{ source: 'brand/apple-touch.svg', out: 'apple-touch-icon.png', size: 180 }
];

const browser = await chromium.launch();

try {
	const page = await browser.newPage();

	for (const { source, out, size, transparent = false } of TARGETS) {
		const svg = await readFile(join(staticDir, source), 'utf8');

		await page.setViewportSize({ width: size, height: size });
		await page.setContent(
			`<!doctype html><html><head><style>
				html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:transparent}
				svg{display:block;width:${size}px;height:${size}px}
			</style></head><body>${svg}</body></html>`,
			{ waitUntil: 'load' }
		);

		await writeFile(
			join(staticDir, out),
			await page.screenshot({ omitBackground: transparent, type: 'png' })
		);

		console.log(`${out}  ${size}x${size}${transparent ? '  (transparent)' : ''}`);
	}
} finally {
	await browser.close();
}
