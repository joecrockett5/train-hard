# frontend

The SvelteKit app. Svelte 4, `adapter-node`, Tailwind, and a set of
[shadcn-svelte](https://www.shadcn-svelte.com) components over
[bits-ui](https://www.bits-ui.com).

For running the whole stack, start at the
[root README](../README.md). This file is for working on the frontend itself.

## Running it

In dev mode the frontend runs on the Vite dev server with the source
bind-mounted, so edits take effect without a rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

It is then on **http://localhost:5173**.

To run it on the host instead, point it at a backend and start Vite. The
backend still has to be up — the SvelteKit server calls it on every request:

```bash
npm ci
HARD_API=http://localhost:8000/api npm run dev
```

## Checks

The same four gates CI runs. A green local run is a green CI run:

```bash
npm run check   # svelte-check
npm run lint    # prettier --check && eslint
npm test        # vitest
npm run format  # prettier --write, when lint complains
```

## How it is laid out

```
src/
  app.css                 Tailwind layers, the theme tokens and .tag-badge
  hooks.server.ts         Puts the dark class in the markup before it is sent
  routes/
    api/                  The only thing that talks to the backend
    workouts/ exercises/ body-weight/ templates/ profiles/
  lib/
    server/               Backend client and profile resolution, server-only
    hard-components/      This app's own components
    components/ui/        shadcn-svelte primitives, generated
    svg/                  Icons
    *.ts                  Pure helpers, each with a *.test.ts beside it
```

### The `/api/*` routes

The browser never calls the backend. `src/routes/api/*` is the only thing that
does: it attaches the active profile as an `X-Profile-Id` header and
translates `camelCase` ↔ `snake_case` on the way through (`lib/mapping.ts`).

That is why there is no browser-facing backend URL and no CORS configuration
anywhere — `HARD_API` is read server-side only, and no cross-origin request is
ever made.

### The pure helpers

Anything with arithmetic or formatting in it lives in `src/lib/*.ts` with a
test file beside it, rather than inside a component:

|                       |                                                       |
| --------------------- | ----------------------------------------------------- |
| `weight-chart.ts`     | Scaling and axis arithmetic for the body-weight SVG   |
| `sets.ts`             | Summarising a set list as `REPS×WEIGHT` or `MINUTESm` |
| `units.ts`            | kg ↔ lbs, and formatting to two places               |
| `tags.ts`             | The colour palette and picking the next unused colour |
| `dates.ts`            | Formatting and the week the calendar opens on         |
| `mapping.ts`          | `camelCase` ↔ `snake_case` for the API routes        |
| `templates.ts`        | Turning a workout into a template and back            |
| `photo-comparison.ts` | Choosing and pairing progress photos                  |

Keeping them out of the components is what makes them testable without
mounting anything, and `npm test` is fast because of it.

### Components

`lib/components/ui/` is generated shadcn-svelte; treat it as vendored and
prefer wrapping it in `lib/hard-components/` over editing it in place.

`lib/hard-components/` is this app's own: dialogs, the exercise card, the
pager, the tag badge and picker, the toggles in the nav sheet.

## Things worth knowing before changing something

- **The theme class arrives two different ways.** `hooks.server.ts` writes it
  into the markup on a full load, and `+layout.svelte` syncs it on a
  client-side navigation. Changing one without the other produces either a
  white flash or a stale theme after switching profile. See
  [the architecture notes](../docs/architecture.md#dark-mode).
- **Weights are always stored in kilograms.** The profile's `weight_unit` is
  display only; `units.ts` converts at the edges. Never write a converted
  value back.
- **Form POSTs are origin-checked** by `adapter-node`, and selecting a profile
  is a form POST. If a form silently does nothing, it is the origin — see
  [configuration](../docs/configuration.md#the-origin-in-detail).
- **Prettier uses tabs**, single quotes and a 100-column width. `npm run
format` settles every argument about it.
- **Strings are the one thing that differ between branches.** `main` is
  English, `japanese` is Japanese; anything else you change should land on
  both.
