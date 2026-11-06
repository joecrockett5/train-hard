# train-hard brand

The mark, the palette, the type and the tone the app is written in. Every
colour here has been checked rather than chosen by eye — the contrast figures
quoted are WCAG ratios, and the tag palette is run through the
six-check categorical validator (lightness band, chroma floor, protan/deutan
separation, normal-vision separation, contrast) in both themes.

## The mark

The app has exactly one picture in it: the body-weight line going up. So that
is the mark — a rising three-step graph with the latest reading marked on it,
knocked out of a warm ramp in near-black ink.

It is meant to be literal. The thing the app does is show you a line, over
months, going the way you wanted it to go, and a mark that is a dumbbell or a
flexed arm would say "gym" where this says "progress".

### The files

| File | What it is | Use it for |
| --- | --- | --- |
| `frontend/static/brand/logo-lockup.svg` | Mark + wordmark, 236×64 | Headers, the profile picker, README, anywhere with room for the name |
| `frontend/static/brand/logo-mark.svg` | The square mark alone, 64×64, rounded | App icon, avatars, tight spaces |
| `frontend/static/brand/logo-mono.svg` | Lockup in `currentColor`, no ramp | One-colour printing, embroidery, a dark press sheet, forced-colors mode |
| `frontend/static/brand/icon-maskable.svg` | Full-bleed source for maskable PNGs | Android adaptive icons |
| `frontend/static/brand/apple-touch.svg` | Full-bleed, opaque, mark at 80% | iOS Home Screen |
| `frontend/static/favicon.svg` | Simplified two-segment mark | Browser tabs |

PNGs are generated from these, never drawn separately:

```bash
cd frontend && node scripts/render-icons.mjs
```

That produces `favicon.png`, `icon-192.png`, `icon-512.png`,
`icon-maskable-192.png`, `icon-maskable-512.png` and `apple-touch-icon.png`.
It needs Playwright's Chromium, which is why it is run by hand rather than
wired into the build — the production image has no browser in it and should
not grow one to redraw an icon that changes once a year.

### Usage

- **Clear space** is half the mark's height on every side. The lockup's own
  left edge is the mark; nothing sits between the mark and the wordmark.
- **Minimum sizes**: the mark 20 px, the lockup 96 px wide. Below 20 px use
  `favicon.svg`, which drops the dip in the line because at 16 px the middle
  step closes into a smudge.
- **The node stays.** The dot at the top right is the current reading; a
  version of the mark without it is a tick, not a graph.
- **Do not** re-colour the ramp, put the mark on a busy photograph, rotate it,
  outline it, add a shadow, or stretch the lockup non-uniformly.
- **Do not** set the wordmark in another face. Two weights of one face is the
  whole idea: `train` recedes, `hard` lands.
- On anything that cannot hold a gradient, use `logo-mono.svg` rather than
  flattening the ramp to one of its ends.

The wordmark is live `<text>` in the geometric-sans stack rather than outlined
paths, so it inherits whatever the host has and stays editable. If the logo is
ever used off-platform — print, a sticker, someone else's site — outline it
first.

## Palette

### The ramp

The old logo ran `#ff3131` → `#ff914d`: pure red to orange. That ramp has one
real problem, which is that `#ff3131` *is* the destructive colour. A delete
button and the brand were the same hue, and a fully saturated red at that
lightness does not pass AA as text on either theme.

So the ramp is **evolved rather than replaced**: same warm family, same
direction of travel, rotated off red and onto the orange–amber band. It reads
as heat from a forge rather than an alarm, and it leaves red free to mean only
one thing.

| Token | Value | What it is |
| --- | --- | --- |
| `--brand-from` | `#EF6C1A` | Ember. The bottom of the climb. |
| `--brand-to` | `#FBB724` | Amber. The top. |
| `--on-brand` | `#14110F` | What goes *on* the ramp. |

The ramp is a **graphic**, not a text colour: the mark, the chart line, the
primary action, the active tab indicator. It always runs bottom-left to
top-right, the same direction the line climbs.

Anything on the ramp is set in near-black ink, never white. This is measured,
not stylistic: `#14110F` scores 6.12:1 against the ember end and 10.66:1
against the amber end, so a label stays AA across the whole sweep, whereas
white falls to 1.8:1 at the amber end and is unreadable over half of any
gradient button.

### Brand as a solid

Text, icons and the focus ring cannot use the ramp, so each theme has one
accessible solid drawn from the same hue:

| | Value | On its surface |
| --- | --- | --- |
| Light | `#B34D08` | 5.27:1 |
| Dark | `#FBA94C` | 9.06:1 |

### Surfaces and ink

Warm neutrals, not grey ones — a cool grey next to an amber ramp makes the
amber look dirty. Dark mode is **selected**, not an inversion: it is its own
set of steps, checked against its own surfaces.

| Token | Light | Dark | Contrast (light / dark) |
| --- | --- | --- | --- |
| `--surface` | `#FBFAF9` | `#14110F` | page background |
| `--surface-raised` | `#FFFFFF` | `#1C1917` | cards |
| `--surface-sunken` | `#F4F2F0` | `#100E0C` | fields, wells |
| `--surface-overlay` | `#FFFFFF` | `#24201D` | dialogs, sheets |
| `--ink` | `#1C1917` | `#FAFAF9` | 17.5 / 16.7 |
| `--ink-muted` | `#57534E` | `#C4BEB8` | 7.6 / 9.5 |
| `--ink-subtle` | `#78716C` | `#A8A29E` | 4.8 / 6.9 |
| `--line` | `#E7E4E1` | `#302B27` | decorative rules |
| `--field-line` | `#8A827B` | `#78716C` | 3.4+ / 3.6+ — control boundaries, per WCAG 1.4.11 |

Every ink token clears 4.5:1 on both of its surfaces, so there is no step in
the scale that cannot legally carry body text.

### Status

| Token | Light | Dark | Means |
| --- | --- | --- | --- |
| `--danger` | `#B91C1C` | `#F87171` | destructive text and icons |
| `--danger-solid` | `#B91C1C` | `#DC2626` | the fill behind white on a Delete button |
| `--positive` | `#15803D` | `#4ADE80` | a set that beat the last one |

Two rules keep red unambiguous:

1. **The ramp is never used for a destructive action**, and destructive is
   never a gradient. Warm-with-a-gradient means go; flat red means undo.
2. **Status is never colour alone.** The set comparison ships a tick, a cross
   or a dash beside the colour, and "equal" is `--ink-subtle` rather than a
   third hue.

### Tag palette

Ten mid-tones, in the order a new tag takes them. A tag stores **one** hex;
the badge mixes its fill and border from that value with `color-mix`, and the
dark theme lifts the label toward white — so a single stored colour reads in
both themes and nothing can drift out of step.

| # | Hex | Name |
| --- | --- | --- |
| 1 | `#D6336C` | Raspberry |
| 2 | `#1C7ED6` | Blue |
| 3 | `#2F9E44` | Green |
| 4 | `#AE3EC9` | Grape |
| 5 | `#0CA678` | Teal |
| 6 | `#7048E8` | Violet |
| 7 | `#B07A00` | Bronze |
| 8 | `#0B8CA8` | Cyan |
| 9 | `#4263EB` | Indigo |
| 10 | `#6B9B10` | Olive |

Three things decided that list:

- **It avoids the brand band and the danger band.** No orange, no red. A tag
  must never be mistakable for the app's own accent or for a delete.
- **It is ordered for consecutive distinctness**, because the order is also
  the assignment order — the first two tags a profile makes are raspberry and
  blue, not two neighbouring blues.
- **It is validated, not eyeballed.** All ten pass the lightness band, the
  chroma floor, protan/deutan separation on every adjacent pair, the
  normal-vision floor and 3:1 contrast — against `#FFFFFF` *and* against
  `#1C1917`. Both runs are clean, which is what makes one stored hex per tag
  workable.

Tags created before this palette keep the hex they were stored with. Nothing
is rewritten; the new list only governs what the next tag is given.

### The chart

The weight line uses the ramp, in user space across the whole plot, so the
line, the area beneath it and every point sample one gradient rather than each
repeating it inside its own bounding box. `--chart-from` / `--chart-to` are
kept as names and now alias `--brand-from` / `--brand-to`, so the chart is
brand-coloured by construction rather than by a copied pair of hexes.

A single series needs no legend — the card title names it — and the axes and
grid are `--ink-subtle` and `--line`, recessive against the one thing on the
plot that matters.

## Typography

One face, from the system, in two or three weights.

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
Arial, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif
```

No web font. This is a self-hosted PWA that has to work in a gym basement, and
a font request is a render-blocking round trip to somewhere the phone cannot
reach. The Japanese faces are in the stack on purpose: the `japanese` locale
has to be a locale, not a fork, and that starts with the two builds sharing a
type stack.

| Token | Size | Used for |
| --- | --- | --- |
| `--text-2xs` | 11px | Overlines, axis labels |
| `--text-xs` | 12px | Helper text, badges, timestamps |
| `--text-sm` | 14px | Secondary body, card descriptions |
| `--text-base` | 16px | Body, inputs — never smaller, or iOS zooms on focus |
| `--text-lg` | 18px | Card titles |
| `--text-xl` | 22px | Screen titles |
| `--text-2xl` | 28px | Hero figures |
| `--text-3xl` | 34px | The dashboard's headline weight |

Weights: 400 body, 500 emphasis, 600 titles and labels, 800 the wordmark and
hero figures only.

**Figures are tabular.** Weights, reps, durations and dates all carry
`font-variant-numeric: tabular-nums`, so a column of sets does not jitter as
the digits change and `5×82.5` lines up under `12×60`.

## Spacing, radius, elevation, motion

- **Spacing** is a 4px scale: `--space-1` 4px through `--space-10` 64px.
  Screen gutter is 16px on a phone and caps at a 640px column on a desktop.
- **Radius**: `--radius-sm` 8px (badges, chips), `--radius-md` 12px (buttons,
  fields), `--radius-lg` 16px (cards), `--radius-xl` 22px (sheets, dialogs),
  `--radius-full` for pills.
- **Elevation** is a light-theme device. Light uses three soft, warm-tinted
  shadows; dark raises the surface instead and keeps a hairline, because a
  shadow against `#14110F` is invisible and a border is not.
- **Motion** is short and purposeful: `--dur-fast` 120ms for state, `--dur`
  180ms for sheets and dialogs, `--ease` a standard decelerate. Every
  transition and animation is disabled under `prefers-reduced-motion:
  reduce` — the sheet still appears, it just stops sliding.

## Touch and focus

- Every interactive target is **at least 44×44 px**, including icon buttons,
  tag chips, calendar days and pager links. Where the visible shape is
  smaller, the target is padded out around it.
- Focus is a 2px `--brand` ring with a 2px offset, drawn with
  `:focus-visible`, so it follows the keyboard and never flashes on a tap.
- Nothing conveys meaning by colour alone.

## Tone

The app is for one person, in a gym, between sets, holding a phone in one
hand. The writing follows.

- **Plain and short.** "Start today's workout". "No weigh-ins yet."
- **Say what happened, and what to do about it.** Not "Error 500" but "Could
  not reach the app, and no copy of this page is stored on this device."
- **Never blame the reader.** The exercises list says "No exercises match",
  not "Your filters match nothing" — the list is empty for several reasons and
  only one of them is something they did.
- **British English**, sentence case everywhere. Buttons are verbs: Add, Save,
  Delete, Start.
- **No exclamation marks, no encouragement, no streaks.** It is a logbook.
  Motivation is the user's business; the app's business is being accurate and
  getting out of the way.
- **Every string lives in `src/lib/i18n`**, so none of the above has to be
  re-decided when the Japanese locale comes back.
