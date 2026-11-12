# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each release is published as a pair of images on GHCR; see
[published images](docs/deployment.md#published-images) for which tag is which
language.

## [Unreleased]

## [1.0.0] - 2026-11-12

The first tagged release. Everything below already worked; this is the point
at which it got a version number, a licence and a set of docs to go with it.

### Added

- **Added** this changelog, an [MIT licence](LICENSE), a
  [contributing guide](.github/CONTRIBUTING.md), a
  [code of conduct](.github/CODE_OF_CONDUCT.md), a
  [security policy](.github/SECURITY.md), and issue and pull request
  templates.
- **Added** `docs/`: [deployment](docs/deployment.md),
  [configuration](docs/configuration.md),
  [architecture](docs/architecture.md) and
  [troubleshooting](docs/troubleshooting.md), split out of the README.
- **Added** a release workflow, which cuts a GitHub Release from a `v*` tag
  with generated notes and checks the tag against the version in both
  manifests.

### What 1.0.0 contains

- **Profiles instead of accounts.** No passwords; a profile is a name, and
  picking one scopes every workout, exercise and set to it.
- **Workouts, exercises and sets**, with working and warm-up sets, the
  previous session's numbers shown beside the input, and templates to import
  a session's shape.
- **Tags** on exercises, with colours assigned from a fixed palette and
  any-of filtering on both the library and the picker.
- **Cardio** as timed intervals: an exercise is `reps` or `time`, and a timed
  one logs durations in minutes.
- **Body weight**, graphed as hand-written SVG with points spaced by elapsed
  days, and **progress photos** attached to a weigh-in with a side-by-side
  comparison.
- **kg or lbs** as a display preference over storage that is always
  kilograms, so a round trip through either unit is lossless.
- **Dark mode** as a per-profile preference, applied server-side before the
  response is sent.
- **Installable to a phone**, with a web manifest and a service worker that
  caches the interface but deliberately not `/api`.
- **One `docker compose up`** from a clean clone, with tables created
  automatically and no `.env` to write.
- **Published images** on GHCR for both branches, with the languages kept on
  separate tags, and a Watchtower compose file for unattended updates.
- **CI** on every push and pull request: backend tests in the shipping image,
  frontend type checks, lint and unit tests, and a smoke test that brings the
  whole stack up, logs a set end to end and asserts the data survives a
  restart.

[Unreleased]: https://github.com/joecrockett5/train-hard/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/joecrockett5/train-hard/releases/tag/v1.0.0
