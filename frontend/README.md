# train-hard frontend

The SvelteKit app. Run it with the rest of the stack from the repository root
-- `docker compose up --build`, or `-f docker-compose.dev.yml` for hot
reload. The root [README](../README.md) covers all of that; this file is
about the inside of this directory.

## Layout

```
src/
  app.html            The document shell. %theme%, %lang% and %themeColor%
                      are substituted per request by hooks.server.ts.
  hooks.server.ts     The profile gate, the theme attribute, the locale.
  service-worker.ts   Caches the app's own assets. Never anything under /api.
  lib/
    styles/           tokens.css is every colour, size, radius and duration
                      in the app; base.css is the reset and the few global
                      rules. There is no utility layer.
    ui/               The primitives: Button, Card, Dialog, Field, TextInput,
                      SegmentedControl, Calendar, Pager, Icon, Toaster.
    components/       The app's own pieces, built from those.
    i18n/             Every user-facing string, and the date formats.
    server/           Talking to the backend; never imported by the browser.
    *.ts              The domain: units, tags, sets, the chart's geometry,
                      templates, photos, the dashboard's summaries.
  routes/
    api/              Server routes that proxy to the backend, translating
                      camelCase <-> snake_case and attaching X-Profile-Id.
                      The browser talks to these and to nothing else.
    */                The screens.
e2e/                  Playwright tests, against a running stack.
static/brand/         The logo, as SVG. See ../docs/branding.md.
scripts/render-icons  Regenerates the PNG icon set from those SVGs.
```

## The rules worth knowing before changing anything

- **No hard-coded strings.** Everything a person reads comes from
  `src/lib/i18n`, and every date is formatted through `i18n/format.ts`. That
  is what lets the Japanese UI be a locale rather than a branch.
- **No hard-coded values.** Colours, sizes, radii and durations come from
  `tokens.css`. If a component needs a value that is not there, the token is
  what is missing.
- **Every weight stored is kilograms.** `weightUnit` is display and input
  parsing only. Nothing converts on write.
- **Nothing you tap is smaller than 44px**, whatever its visible size, and
  nothing is distinguished by colour alone.
- **The browser never calls the backend.** Add a server route under
  `routes/api` instead, and map the field names there.

## Checks

```bash
npm ci
npm run check      # svelte-check
npm run lint       # prettier + eslint
npm test           # vitest
npm run test:e2e   # playwright, needs the stack up
```

The unit tests cover the arithmetic rather than the markup -- unit
conversion, the chart's scaling, tag colours, the mappers, the calendar's
dates, the dashboard's summaries -- which is why they survived the interface
being rewritten around them.
