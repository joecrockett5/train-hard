# Frontend audit

A reading of the whole of `frontend/` as it stood at `d06f4ab`, written before
any of the rebuild, so that the new UI has something to be checked against
rather than a memory of what the old one did.

Everything below is a parity item. The checklist at the end is ticked off
against the finished rebuild.

## Framework choice

SvelteKit 2 is kept, on Svelte 5 runes, with the component library (shadcn
generated into `lib/components/ui`, `bits-ui`, `lucide-svelte`,
`svelte-gestures`, Tailwind) dropped for hand-written primitives and CSS
custom-property design tokens. The constraints pick the framework: `ORIGIN` /
`PROTOCOL_HEADER` / `HOST_HEADER`, the CSRF origin check behind a proxy and
the single-process Docker image *are* `adapter-node`, and the no-flash theme
and `/api/*` proxy are SvelteKit server routes. Replacing the framework would
mean reimplementing those; replacing the UI layer is where the actual rebuild
is. So the shell stays and everything above it is new.

## Routes

### Pages

| Route | What it does | Loads / calls |
| --- | --- | --- |
| `/` | Home. Logo, profile name card, "Start today's workout" dialog (title, notes, optional template import), weight chart card linking to `/body-weight`, or a "could not load your weigh-ins" card. | server: `GET /api/body-weights`, `GET /api/templates`; client: `POST /api/workouts`, then `importTemplate` → `GET /api/templates/{id}/detail` + `POST /api/exercise-joins` per exercise, then `goto` the workout |
| `/profiles` | Profile picker. Lists profiles alphabetically, highlights the active one, create-a-profile form. Reachable without a profile. | server load calls the backend **directly** (`GET {HARD_API}/profiles`) because `/api/*` requires a profile; form actions `?/select`, `?/create`, `?/switch` |
| `/workouts` | Calendar (month grid), selected-date heading, new-workout dialog, list of that date's workouts. Left/right **swipe** moves a day. `?date=` preselects. | server: `GET /api/templates`; client per date change: `GET /api/workouts?date=`; `POST /api/workouts`; template import as above |
| `/workouts/[workoutId]` | The workout. Editable header card (title, notes, date shown read-only, save-as-template, delete, back-to-date link), add-an-exercise picker (search by name/description, ANY-tag filter, pager, new-exercise dialog, import-template), then a card per exercise with warm-up and working sets. | server: `GET /api/workouts/{id}/detail`, `GET /api/tags`, `GET /api/templates`; client: `POST`/`DELETE /api/exercise-joins`, `PUT`/`DELETE /api/workouts/{id}`, `POST /api/template-joins` (via save-as-template), `GET /api/sets/recent?exercise=`, `POST`/`PUT`/`DELETE /api/sets`, `GET /api/exercise-joins?workout=&exercise=` |
| `/exercises` | All exercises, newest first, ANY-tag filter, pager, new-exercise dialog, per-exercise edit dialog (name, description, tag picker, delete). | server: `GET /api/exercises`, `GET /api/tags`; client: `POST`/`PUT`/`DELETE /api/exercises`, `POST`/`DELETE /api/tag-joins`, `POST /api/tags` |
| `/templates` | All templates, newest first, ANY-tag filter, pager, new-template dialog. Each card links to its detail page and shows an exercise count. | server: `GET /api/templates`, `GET /api/tags`; client: `POST /api/templates`, `POST /api/tag-joins` |
| `/templates/[templateId]` | The template. Editable header (name, notes, tags, delete, back link, exercise count), add-an-exercise picker (search, tag filter, pager, new exercise), list of its exercises each with a Remove confirm. | server: `GET /api/templates/{id}/detail`, `GET /api/tags`; client: `POST`/`DELETE /api/template-joins`, `PUT`/`DELETE /api/templates/{id}` |
| `/body-weight` | Weigh-ins. Header card, weight chart over every entry, "Compare photos" button when two dates have photos, new-weigh-in dialog (date, weight in the shown unit, notes, photo picker), pager above and below, a card per weigh-in with notes, a collapsible photo gallery and an edit dialog. | server: `GET /api/body-weights`, `GET /api/progress-photos`; client: `POST`/`PUT`/`DELETE /api/body-weights`, `POST`/`DELETE /api/progress-photos`, `GET /api/progress-photos/{id}/file` |
| `/body-weight/compare` | Two dates' progress photos side by side, two native date selects, per-side thumbnail strips, a link/unlink toggle, each side's weight and date. Two columns at every width. | server: `GET /api/body-weights`, `GET /api/progress-photos` |

### Server `/api/*` proxy routes

The browser never calls the backend. Each of these attaches `X-Profile-Id`,
translates `camelCase` ↔ `snake_case` and answers 401 with no profile.

`body-weights` (GET, POST) · `body-weights/[id]` (GET, PUT, DELETE) ·
`exercise-joins` (GET, POST, DELETE-by-pair) · `exercise-joins/[id]` (GET
resolving to the exercise with that join's sets, PUT, DELETE) · `exercises`
(GET, POST) · `exercises/[id]` (GET, PUT, DELETE) ·
`exercises/[id]/workoutTitle` (GET, via the most recent exercise-join) ·
`preferences` (PUT, read-modify-write of the profile for `darkMode` /
`weightUnit`) · `progress-photos` (GET, POST raw image body) ·
`progress-photos/[id]` (DELETE) · `progress-photos/[id]/file` (GET, passes
bytes and cache headers through) · `sets` (GET, POST) · `sets/[id]` (GET, PUT,
DELETE) · `sets/recent` (GET, the previous 3 sessions' sets keyed by
exercise-join timestamp, dropping the session in progress, 404 when there is
no history) · `tag-joins` (GET, POST, DELETE-by-pair) · `tags` (GET, POST) ·
`tags/[id]` (GET, PUT, DELETE) · `template-joins` (GET, POST,
DELETE-by-pair) · `template-joins/[id]` (DELETE) · `templates` (GET, POST) ·
`templates/[id]` (GET, PUT, DELETE) · `templates/[id]/detail` (GET) ·
`workouts` (GET with optional `date`, POST) · `workouts/[id]` (GET, PUT,
DELETE) · `workouts/[id]/detail` (GET).

## Settings and preferences, and where they live today

This is the part the rebuild is meant to change, so it is listed exhaustively.

| Setting | Stored as | Surfaced today |
| --- | --- | --- |
| Dark mode | `dark_mode` on the `Profile`; mirrored into a `theme` cookie for first paint | Sun/moon icon button in the nav sheet (`theme-toggle.svelte`), bottom row |
| Weight unit | `weight_unit` on the `Profile` (`kg`/`lbs`) | `kg`/`lbs` icon button in the nav sheet (`unit-toggle.svelte`), bottom row |
| Active profile | `profileId` cookie | Nav sheet: a form posting `/profiles?/switch`, labelled "{name} · Switch profile"; also `/profiles` itself |
| Create profile | — | `/profiles` only |
| Profile name | `name` on the `Profile` | **Nowhere.** The backend accepts a rename (`PUT /api/profiles/{id}`); no UI reaches it |
| Navigation targets | — | Nav sheet: Workouts, Exercises, Body Weight, Templates buttons, plus a "Recent" list of the last 2 workouts fetched on first open |
| Exercise kind (`reps`/`time`) | `kind` on the `Exercise` | Per-exercise, in the creation dialog only — a property of the exercise, not an app setting |
| Tag colour | `color_hex` on the `Tag` | Assigned automatically, never chosen |

Three findings worth carrying into the rebuild:

1. There are exactly **two** app-wide preferences, both on the profile, and
   both are currently unlabelled icon buttons in a bottom sheet that also
   holds navigation and a recent-workouts list. The sheet is doing three
   unrelated jobs.
2. **Profile rename has no UI** although the backend supports it. The brief
   asks Profile Settings to cover "profile identity (name)", so the rebuild
   adds it. It is additive and touches no existing data.
3. **A "System" appearance option cannot be stored.** `dark_mode` is a
   boolean on the profile; a third value would be a backend data-model change,
   which is out of scope without asking. The rebuild ships Light / Dark only
   and says so in the UI copy.

No other preference exists anywhere — no units for body weight separate from
sets, no page size control, no locale switch, no notification settings. The
pager's `PAGE_SIZE` (8) and the set-history length (3) are constants, not
preferences.

## Features, including the edge cases

### Profiles
- No passwords; a profile is a name. Selecting one scopes every read and write.
- Selection in a `profileId` cookie, 1 year, `httpOnly`, `sameSite=lax`,
  `secure` **computed from the request scheme** — a Secure cookie over plain
  HTTP is dropped and selecting a profile then silently does nothing.
- Any page without a profile redirects 307 to `/profiles?redirectTo=…`; any
  `/api/*` route without one answers 401 rather than the picker's HTML.
- Requests for paths with a file extension are never gated.
- A cookie can outlive its profile (`docker compose down -v`): the layout's
  load treats 404 as "clear the cookie and bounce to the picker", but a
  transport failure as "keep the cookie, show the raw id", so a restarting
  backend does not log anybody out.
- The picker submits with `use:enhance`, so choosing a profile is a
  client-side navigation and the document is never replaced.
- `?/select` resolves the profile server-side before redirecting, so the next
  page paints in the right theme instead of flashing the previous profile's.
- Profile names are cached in the server process for 60 s; the cache is
  dropped on select and on any preference write.

### Workouts
- Create, view, edit (title, notes), delete.
- `workout_date` is separate from the row `timestamp`, so a workout entered
  days later lands on the right day. The date is not editable after creation.
- The calendar's selected date drives a fetch per date. Swipe left/right moves
  a day. `?date=` preselects, and deleting a workout returns to
  `/workouts?date=<its date>`.
- Two workouts on the same day are allowed.
- Exercises within a workout are ordered: ones with sets first, then by when
  their first set was logged.
- Exercise cards are keyed by **join id**, not exercise id, because the same
  exercise can appear in two workouts.
- Templates: import into a new or existing workout (skipping exercises already
  present, and surviving individual join failures), and save the open workout
  as a template.

### Exercises
- `/exercises`: newest first, create, edit name/description, delete.
- `kind` is `reps` (default) or `time`, chosen in the creation dialog as two
  labelled buttons. Rows written before `kind` existed read as `reps`.
- The add-an-exercise picker on a workout: search over name **and**
  description, ANY-tag filter, pager, create-and-add in one step, import a
  template. Exercises already in the workout are excluded. Adding one clears
  the search and filter and resets to page 1.
- Deleting an exercise from `/exercises` removes it from the list without a
  reload.

### Sets
- Log, edit, delete. Weight, reps, duration, notes, and `setType` of
  `working` or `warmup`.
- A new working set prefills its weight from the last working set of the
  session, or failing that from the heaviest working set of the most recent
  previous session; a new warm-up set prefills from the previous session's
  first warm-up set.
- `inputmode` is `decimal` for a weight and `numeric` for reps and minutes, so
  iOS offers a usable keypad — `type="tel"` previously offered a pad with no
  decimal point.
- Deleting a set re-`goto`s the workout page.
- A set-history popover per previous session (up to 3), each listing that
  session's warm-up and working sets, with a tick / cross / dash comparing
  each working set against the same position in the session before it —
  heavier wins, else more total work, else equal.
- A skeleton placeholder shows while a set is being created.
- A timed exercise offers no warm-up list unless warm-up sets already exist.

### Tags
- Created and applied from an exercise's (or template's) edit dialog, and from
  the create dialogs.
- Applied optimistically and rolled back if the write fails; joins are written
  as toggled, not on save.
- Duplicate names are refused, case- and space-insensitively, with the reason
  shown.
- Filter by tag on `/exercises`, `/templates`, both add-an-exercise pickers
  and the import-template dialog. Filtering is **ANY**, not ALL. Selecting
  nothing filters nothing. An item with no `tags` field at all is tolerated.
- The filter only offers tags that appear on something in the list being
  filtered.
- Colours come from a fixed 10-entry palette of Tailwind 600-weights; a new tag
  takes the first unused one, reuses a colour freed by a deletion, and wraps
  past ten rather than refusing.
- One stored colour reads in both themes: `.tag-badge` mixes fill and border
  from it with `color-mix`, and lifts the label towards white in dark mode.
- Changing the filter resets the pager to page 1 — and does so from the
  event, not a reactive block, because a block that assigns `page` re-runs on
  the pager's own writes and traps the reader on page 1.
- Only exercises and templates are taggable. `Tag.for_sets` / `for_workouts`
  exist on the model and nothing reads them.

### Body weight
- `/body-weight`. A weigh-in is a date, a kg reading and optional notes.
- Always kilograms — no unit per weigh-in, deliberately.
- `entry_date` separate from `timestamp`, as a workout's is.
- The chart plots **every** entry for the profile; only the list below is
  paged. Points are spaced by **elapsed days**, so a gap looks like a gap.
- Hand-written SVG; the arithmetic is in `weight-chart.ts` so it can be tested
  without rendering. Value axis rounds to 1/2/5×10ⁿ steps bracketing the data;
  a flat series is given a 1 kg range so the line sits mid-plot; a lone entry
  is centred; up to 4 x-axis labels, always including first and last, never
  repeating a date. The line, its area fill and the points all sample one
  user-space gradient across the plot.
- Headline summary: latest weight and date, and the change since the first
  entry (nothing to report from a single entry).
- Progress photos per weigh-in: picked with a plain `accept="image/*"` input
  (so iOS offers camera *and* library), shrunk client-side to a 1600 px long
  edge at JPEG 0.82 — drawn from an `<img>` so EXIF orientation is applied —
  and uploaded as a raw body, one request per file, tolerating individual
  failures. Collapsed behind a "N photos" disclosure, full-size in a dialog,
  removable from the edit dialog. Loaded eagerly on purpose, and a missing
  file renders "Photo unavailable" rather than an empty box.
- `/body-weight/compare`: offered only when two dates have photos. Defaults to
  the oldest and newest pair, pairs photos by position with a link/unlink
  toggle, clamps a position when a side has fewer photos, fits rather than
  crops so the two bodies stay to one scale.

### Units
- Every weight in the database is kilograms; `weight_unit` is display and
  input parsing only. Toggling never rewrites a row and a round trip through
  the other unit returns the original number.
- `KG_PER_LB = 0.45359237` exactly.
- Display to 2 dp with trailing zeros dropped (`80`, not `80.00`; `80.25`, not
  `80.3`). Durations to 1 dp, trailing zero dropped.
- The unit is a store, not a prop, because a set's weight renders several
  components deep; the layout sets it from the profile and only when the
  server's own value changes, so a toggle is not undone by the page's
  stale data.
- Sets are written with `weightUnit: 'kg'` whatever is on screen.

### Dark mode
- Per profile, `dark_mode`.
- First paint: `hooks.server.ts` substitutes `%theme%` into `<html class>`
  from the `theme` cookie, so there is no flash of the wrong theme on a full
  load. The cookie is a copy; the profile is the source of truth and the
  layout corrects the cookie whenever they disagree.
- Client-side navigation: the layout syncs the class from the layout data, so
  switching profiles without a document reload changes the theme.
- Toggling is optimistic, reverting if the write fails.
- Switching profiles clears the theme cookie as well as the profile cookie, so
  the picker does not inherit the last profile's theme.

### PWA
- `manifest.webmanifest`, 192/512 icons (512 doubling as maskable), an
  `apple-touch-icon.png` with a `?v=` cache-buster (iOS remembers a failed
  icon fetch across data clears), `theme-color`, `apple-mobile-web-app-title`.
- Service worker precaches `build` + `files`, **file by file** so one failure
  cannot strand an old worker, deletes previous versions' caches on activate,
  serves precached assets cache-first, pages network-first with a cached
  fallback and a plain-language 503, and **never** touches `/api/*`.
- The manifest and the icons are deliberately excluded from the worker, because
  the OS fetches those outside any page and a worker can only add a way to
  fail.

### Other behaviour worth keeping
- Every navigation scrolls to the top, including back/forward and a `goto` to
  the current route.
- Pager: page size 8, hidden below one page, clamps when the list shrinks
  under the reader, rendered above *and* below long lists.
- Delete is always behind a confirm dialog ("This cannot be undone").
- Dialogs opened from dialogs take the screen rather than nesting.
- The weight chart card on the home screen is entirely a link, because on a
  phone the card is the target you aim at.

## The current home screen

What `/` shows today, top to bottom:

1. The logo, 128 px, rounded.
2. A card containing only the active profile's name, centred.
3. "Start today's workout" — a full-width 64 px outline button opening a
   dialog with the formatted date as its description, title and notes fields,
   an optional template to import, an error line on failure, and a Start
   button that creates the workout, imports the template if one was picked,
   and navigates to it. Enter in the title field submits. A failure leaves the
   dialog open with what was typed still in it.
4. The weight chart card — the same component `/body-weight` uses, wrapped in
   a link to `/body-weight` — or a "Progress / Could not load your weigh-ins
   just now" card if the weigh-in fetch failed. The two are distinguished on
   purpose: the chart's own empty state says "no weigh-ins yet", which would
   be a lie if the truth is that we could not ask.

Behaviour: the weigh-ins and templates are loaded server-side and degrade to
an empty list rather than a 500, because this is the landing page.

## Known rough edges in the old UI

Recorded because the rebuild should not faithfully reproduce them.

- The nav sheet is the only navigation, is a floating button in the
  bottom-right corner, and mixes navigation, recent workouts, profile
  switching and two preference toggles.
- `text-gray-400` is hard-coded on most outline buttons, which is a fixed grey
  in both themes rather than a token.
- `workout-info.svelte` renders tags with a hand-rolled dot-and-name instead of
  the tag badge, and wraps them in a two-column grid that only ever holds one
  column.
- `/workouts` has an `h-screen` swipe target, so the page is always at least a
  screen tall whether or not anything is on it.
- The set-history popover's comparison indexes `sortedOldInstances.at(-1)`
  for the live session but `at(workoutIndex - 1)` inside the popover, which
  compares the oldest shown session against the newest.
- `exercise.svelte` fetches the exercise-join on **every** set creation to
  find an id the page already has.
- Several strings are hard-coded in markup (`hard: Home`, "Training app",
  `⤶` as a back affordance), which is what makes `main` and `japanese`
  diverge as branches instead of locales.
- `+page.ts` files under `/exercises` and `/workouts/[workoutId]` are empty.
- `frontend/README.md` is still the unmodified `create-svelte` template.

## Parity checklist

Ticked against the rebuild. Every item was checked in the running app unless
it says otherwise; the deliberate differences are listed under it.

- [x] Profiles: list, create, select, switch, cookie semantics, redirect gate, 401 on `/api`, stale-cookie recovery, backend-down tolerance
- [x] Profile rename (new, backend already supported)
- [x] Workouts: create, view, edit, delete, separate workout date, same-day duplicates, calendar, swipe between days, `?date=`, exercise ordering, join-keyed cards
- [x] Templates: list, create, edit, delete, detail page, add/remove exercises, exercise count, import into new workout, import into open workout, save open workout as template
- [x] Exercises: list newest first, create, edit, delete, `kind` reps/time, picker with search over name and description, excluded-already-present, create-and-add
- [x] Sets: log, edit, delete, warm-up vs working, weight prefill, decimal/numeric keypads, creation skeleton, timed exercises in minutes to 1 dp, no warm-up list for timed
- [x] Set history: previous 3 sessions, per-set tick/cross/dash comparison
- [x] Tags: create, apply, remove, duplicate refusal, optimistic writes, ANY filtering on all five surfaces, filter offers only tags in use, fixed palette with first-unused assignment, readable in both themes, filter resets the pager
- [x] Body weight: list, create, edit, delete, kg storage, separate entry date, notes
- [x] Chart: every entry plotted, day-spaced points, rounded value axis, flat-series range, lone-entry centring, ≤4 non-repeating date labels, summary with change, unit-aware, unit-tested
- [x] Progress photos: pick, client-side shrink with EXIF orientation, upload per file, tolerate failures, gallery disclosure, full-size dialog, remove, missing-file message
- [x] Compare photos: availability rule, widest default pair, positional pairing, link/unlink, clamping, fit-not-crop, two columns at all widths
- [x] Units: kg storage, display-only conversion, exact `KG_PER_LB`, 2 dp trailing-zero-dropped, 1 dp durations, lossless round trip, app-wide propagation
- [x] Dark mode: per profile, no flash on full load, correct on client-side navigation, correct on profile switch, optimistic with rollback, cleared on switch
- [x] Unified Profile Settings replacing the two nav-sheet toggles, one place per setting
- [x] Dashboard keeping everything the old home screen did
- [x] PWA: manifest, maskable icons, apple touch icon, service worker assets-only, nothing under `/api` cached, per-file precache, OS-fetched icons excluded
- [x] Scroll to top on every navigation; pager page size 8 with clamping; confirm before every delete
- [x] `ORIGIN` / `PROTOCOL_HEADER` / `HOST_HEADER` behaviour preserved
- [x] Browser talks only to the frontend server; `/api/*` proxy with camelCase ↔ snake_case and `X-Profile-Id`
- [x] All user-facing strings centralised so `japanese` can return as a locale

### What is deliberately different

- **The nav sheet is gone.** Navigation is a bottom tab bar on a phone and a
  side rail from tablet width up; the profile and every setting are behind the
  avatar. The sheet was doing three unrelated jobs and holding the only two
  preferences as unlabelled icon buttons.
- **No "System" appearance.** `dark_mode` is a boolean on the profile, so a
  third value is a data-model change. The Settings screen says so where the
  option would have been.
- **Profile rename is new.** The backend already accepted it; nothing reached
  it. The brief asks Profile Settings to cover profile identity.
- **The exercise kind is editable, not just settable.** It had to become so:
  the update body sends `kind` with a default of `reps`, so saving any edit to
  a timed exercise silently converted it back.
- **Set history is dated by the workout, not the row.** The old UI labelled a
  previous session with the exercise-join's write time, so a week of sessions
  entered on Sunday all read as Sunday.
- **The set comparison compares against the previous session.** It compared
  the live session against the *oldest* session it had fetched.
- **`/workouts` loads every workout once** instead of one request per date, so
  the calendar can mark the days that have something on them and swiping does
  not wait on the network.
- **`/api/preferences` is now `/api/profile`**, because it carries the name as
  well as the two preferences.
- **The tag palette changed.** Existing tags keep the colour they were stored
  with; the new list only governs what the next tag is given.
- **`frontend/todos.md` is gone.** It was a scratch file from the first build,
  listing work that had either been done or been replaced.
