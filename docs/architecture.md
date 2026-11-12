# Architecture

How the three services fit together, what the single DynamoDB table looks
like, and the design decisions behind the features that have one.

- [How the pieces fit together](#how-the-pieces-fit-together)
- [Data model](#data-model)
- [Profiles](#profiles)
- [Tags](#tags)
- [Body weight](#body-weight)
- [Weights and units](#weights-and-units)
- [Cardio](#cardio)
- [Dark mode](#dark-mode)

## How the pieces fit together

```
browser ──▶ frontend :3000 ──▶ backend :8000 ──▶ dynamodb :8000
            (SvelteKit)        (FastAPI)         (DynamoDB Local)
             │                                     │
             └─ /api/* server routes                └─ /data on a named volume
                proxy and rename fields
```

The browser only ever talks to the SvelteKit server. Its `/api/*` routes are
the only thing that calls the backend, translating `camelCase` ↔ `snake_case`
on the way through and attaching the active profile as an `X-Profile-Id`
header. Two consequences worth knowing:

- **There is no browser-facing backend URL**, and none is needed. `HARD_API`
  is read server-side only.
- **There is no CORS configuration**, and none is needed, because no
  cross-origin request is ever made.

## Data model

One DynamoDB table, single-table design:

```
Table hardResources                      BillingMode PAY_PER_REQUEST
  HASH   User_ObjectType  (S)            "{profile_id}#{object_type}"
  RANGE  Timestamp        (S)            ISO-8601

GSI ItemSearch
  HASH   object_id        (S)            Projection: ALL
```

The partition key packs the owning profile and the object type together, which
is why selecting a profile is all it takes to scope the data. `ItemSearch`
exists to fetch an item by `object_id` alone, without knowing its partition.

Object types: `Workout`, `Exercise`, `Set`, `Tag`, `Template`, `ExerciseJoin`,
`TagJoin`, `BodyWeight`, `ProgressPhoto` and `Profile`. Profiles are stored
under a reserved `__system__` owner so the registry can be listed before a
profile has been chosen.

`infra-legacy/serverless.yml` remains the canonical schema definition;
`scripts/init_tables.py` mirrors it.

## Profiles

There are **no passwords**. A profile is just a name, and picking one selects
which data you see — workouts, exercises and sets are partitioned per profile.

Visiting any page without a profile selected redirects to `/profiles`, where
you can pick an existing one or create a new one. The choice is stored in a
`profileId` cookie; the nav sheet (the **+** button, bottom right) has a
switch-profile option.

This replaces the Cognito user pool the AWS version used. See
[infra-legacy/README.md](../infra-legacy/README.md) for what was removed.

## Tags

Exercises can be tagged, mainly with workout types -- Legs, Push, Pull. Tags
are made and applied from an exercise's edit dialog, and both the exercises
page and the add-an-exercise picker on a workout filter by them.

Filtering is **any**, not all: the tags are workout types, so picking Push and
Pull means "the exercises I could do on either day" rather than exercises
that are somehow both.

A tag is stored with one colour, taken from a fixed palette in
[frontend/src/lib/tags.ts](../frontend/src/lib/tags.ts). A new tag gets the
first colour nothing else is using, so a profile's tags come out distinct
without anyone picking colours. The badge mixes its fill and border from that
single value (`.tag-badge` in `app.css`), which is why one stored colour
reads correctly in both themes -- the value is the mid-tone used for the
label, and the pale wash behind it is the same colour at low opacity.

Only exercises are taggable. The `Tag` model carries `for_sets` /
`for_workouts` flags from an earlier design and nothing reads them yet.

Tags resolve through `TagJoin`, so reading them per exercise would be a query
each. Every endpoint that returns exercises builds them with
`exercises_with_tags`, which reads the joins and the tags once and matches
them in memory -- the same approach `workout_detail` takes for sets.

## Body weight

`/body-weight`, reachable from the nav sheet alongside Workouts and
Exercises. A weigh-in is a date, a reading in kilograms and optional notes,
and the page graphs every one of them for the active profile -- date along
the bottom, weight up the side.

Weights are always kilograms. A `Set` carries a unit because a gym's plates
may be imperial; a bathroom scale is whatever its owner set it to once, so
storing a unit per weigh-in would only create the possibility of a graph
comparing two of them.

The date is logged separately from the row's timestamp, as a workout's is, so
a weigh-in can be entered days after the fact and still land on the right
day. Points are spaced by elapsed days rather than evenly, so a gap in the
record looks like a gap.

The chart is hand-written SVG in
[frontend/src/lib/weight-chart.ts](../frontend/src/lib/weight-chart.ts), which
keeps the scaling and axis arithmetic out of the component so it can be
tested directly. No charting library is involved. Its line picks up the
logo's red-to-orange gradient, via `--chart-from` / `--chart-to` in
`app.css`.

## Weights and units

Every weight in the database is kilograms. The profile's `weight_unit` only
decides how they are shown and how a typed number is read back, so the
kg/lbs toggle in the nav sheet never rewrites a row and a round trip through
the other unit returns the number you started with.

Weights display to two decimal places, trailing zeros dropped.

## Cardio

An exercise has a `kind`: `reps`, the default, or `time`. A timed exercise's
sets record a `duration` in minutes to one decimal place instead of reps at a
weight, so a session is logged as intervals -- the same list, measured
differently. The toggle is in the exercise creation dialog.

A set carries all of `weight`, `reps` and `duration` with zero defaults
rather than one shape or the other, because a set is a flat item and the kind
that decides which apply lives on the exercise.

## Dark mode

A per-profile preference, toggled with the sun/moon button in the nav sheet
and stored as `dark_mode` on the profile, so it follows whoever is signed in
rather than the browser.

Tailwind is configured `darkMode: ['class']`, so the whole thing is one class
on `<html>`. Getting that class right turns out to be the only interesting
part, because it has to arrive two different ways:

- **On a full page load**, `hooks.server.ts` puts it in the markup before the
  response is sent. Waiting for JS would mean a white flash on every load of
  a dark profile. It reads a `theme` cookie rather than resolving the
  profile, which would put a backend round trip in front of every render; the
  profile stays the source of truth and the layout corrects the cookie
  whenever the two disagree.
- **On a client-side navigation**, `+layout.svelte` syncs the class from the
  layout's data. The profile picker submits with `use:enhance`, so choosing a
  profile never replaces the document and the server-rendered class would
  otherwise be left over from the previous profile.
