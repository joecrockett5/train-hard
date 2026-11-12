# Contributing

Thanks for looking. This is a small, self-hosted project; issues and pull
requests are both welcome, and so is a bug report that is only half a bug
report.

- [The one rule that matters](#the-one-rule-that-matters)
- [Dev mode](#dev-mode)
- [Running the tests](#running-the-tests)
- [Making a change](#making-a-change)
- [Commits and pull requests](#commits-and-pull-requests)
- [Releases](#releases)

## The one rule that matters

There are two branches, `main` (English) and `japanese`, identical apart from
the interface strings and date formatting. **Any change that is not a
user-facing string should land on both.** Work on `main` unless the change is
Japanese-only, then cherry-pick:

```bash
git checkout japanese
git cherry-pick <sha>
```

A change that touches both strings and behaviour is usually easier split in
two: the behaviour on `main` to cherry-pick cleanly, the strings separately.

## Dev mode

Hot reload for both services — backend via `uvicorn --reload`, frontend via
the Vite dev server, both with the source bind-mounted:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The frontend moves to **http://localhost:5173** in dev mode (the production
container's port 3000 is still published, but it is the dev server you want).

Edits to `backend/src/` and `frontend/src/` take effect without a rebuild.
Rebuild only when you change a dependency manifest:

```bash
docker compose build
```

## Running the tests

The backend suite runs in the same image as the app, with the dev
dependencies layered on:

```bash
docker compose --profile test run --rm test
```

It uses `moto` to mock DynamoDB, so it needs neither the `dynamodb` service
nor any credentials. It covers the data layer and drives the real FastAPI app
through a `TestClient`.

The frontend's checks need Node on the host:

```bash
cd frontend && npm ci && npm run check && npm run lint && npm test
```

`npm run check` is `svelte-check`, `npm test` is Vitest. `npm run format`
applies Prettier rather than only checking it.

All four of these gates run on every push and pull request; see
[`ci.yml`](workflows/ci.yml), which also brings the whole stack up from a
clean checkout, logs a set end to end, and asserts the data survives a
restart.

## Making a change

1. Branch from `main`.
2. Make the change, and add a test if there is a sensible place to put one —
   the data layer and the pure helpers in `frontend/src/lib/` both have
   suites already.
3. Run the four gates above locally. They are the same four CI runs, so a
   green local run is a green CI run.
4. Open a pull request. The template asks for the two things that are easy to
   forget: whether `japanese` needs the same change, and whether it touches
   the data model.

Style is enforced, not discussed: Prettier and ESLint for the frontend, and
the existing file's conventions for Python. Tabs in JS/Svelte, four spaces in
Python, and [`.editorconfig`](../.editorconfig) covers the rest.

## Commits and pull requests

Plain, imperative subject lines — "Add a rest timer", not "added rest timer"
or "feat: rest timer". There is no commit-message convention to follow beyond
being readable, and the generated release notes are grouped by pull request
rather than by prefix.

Keep a pull request to one subject. A refactor and a feature in the same
branch is two pull requests.

## Releases

Maintainers only. A release is a tag:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

That runs CI, which publishes `1.1.0`, `1.1` and `latest` images to GHCR, and
[`release.yml`](workflows/release.yml), which cuts the GitHub Release with
notes generated from the commits since the last tag. Versions follow
[semver](https://semver.org); the version strings in
`frontend/package.json` and `backend/pyproject.toml` are bumped in the commit
that precedes the tag.
