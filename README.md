# train-hard

A workout tracking app. FastAPI backend, SvelteKit frontend, DynamoDB for
storage — all running locally in Docker. No AWS account needed.

```
backend/        FastAPI app (Python 3.11)
frontend/       SvelteKit app (adapter-node)
scripts/        Table creation and seeding
seed-data/      Drop JSON dumps here (gitignored)
infra-legacy/   The old AWS deployment config, kept for reference
```

## Branches

| Branch | UI language |
| --- | --- |
| `main` | English |
| `japanese` | Japanese (日本語) |

They are identical apart from the interface strings and date formatting.
`japanese` is the original UI the app was written with, preserved so it can be
picked up again; `main` is the English translation of it. Any change that is
not a user-facing string should land on both.

## Prerequisites

- Docker Desktop (or any Docker Engine with Compose v2) — nothing else. No
  Python, Node, or AWS CLI on the host.
- Roughly 2 GB free for images.

## Quick start

```bash
docker compose up --build
```

Then open **http://localhost:3000**, create a profile, and you're in.

No other steps: tables are created automatically, and there is no `.env` to
write — every setting has a working default. Copy `.env.example` to `.env`
only if you want to change something (ports, mainly).

| URL | What |
| --- | --- |
| http://localhost:3000 | The app |
| http://localhost:8000/docs | Backend API docs (Swagger), loopback only |
| http://localhost:8000/health | Backend health + DynamoDB reachability, loopback only |
| http://localhost:8001 | DynamoDB Local, loopback only |

## Profiles

There are **no passwords**. A profile is just a name, and picking one selects
which data you see — workouts, exercises and sets are partitioned per profile.

Visiting any page without a profile selected redirects to `/profiles`, where
you can pick an existing one or create a new one. The choice is stored in a
`profileId` cookie; the nav sheet (the **+** button, bottom right) has a
switch-profile option.

This replaces the Cognito user pool the AWS version used. See
[infra-legacy/README.md](infra-legacy/README.md) for what was removed.

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
[frontend/src/lib/weight-chart.ts](frontend/src/lib/weight-chart.ts), which
keeps the scaling and axis arithmetic out of the component so it can be
tested directly. No charting library is involved. Its line picks up the
logo's red-to-orange gradient, via `--chart-from` / `--chart-to` in
`app.css`.

## Tags

Exercises can be tagged, mainly with workout types -- Legs, Push, Pull. Tags
are made and applied from an exercise's edit dialog, and both the exercises
page and the add-an-exercise picker on a workout filter by them.

Filtering is **any**, not all: the tags are workout types, so picking Push and
Pull means "the exercises I could do on either day" rather than exercises
that are somehow both.

A tag is stored with one colour, taken from a fixed palette in
[frontend/src/lib/tags.ts](frontend/src/lib/tags.ts). A new tag gets the
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

## Running it on a server

Behind a reverse proxy (Nginx Proxy Manager, Caddy, Traefik) on your own
network. The example uses `training.jmedia` on port 7999; substitute yours.

**1. Clone it and write a `.env`.**

```bash
git clone <your-repo> train-hard && cd train-hard
cp .env.example .env
```

Two values matter:

```bash
FRONTEND_HOST_PORT=7999          # the port the proxy forwards to
ORIGIN=                          # blank: read it from the proxy's headers
```

`ORIGIN` is the one that catches people. SvelteKit compares it against the
`Origin` header on every form POST, and selecting or creating a profile is a
form POST. Get it wrong and those silently do nothing (a 403 the UI does not
surface).

**Behind a proxy, leave it blank.** The origin is then read per request from
`x-forwarded-proto` and `x-forwarded-host`, which means http:// and https://
both work at the same time — a fixed `ORIGIN` can only ever match one, and
devices on the other scheme get 403s. It also marks the profile cookie
`Secure` on exactly the requests that are secure; a Secure cookie sent over
http is discarded by the browser, which looks like selecting a profile doing
nothing at all.

Set it to an exact URL instead when nothing trustworthy sits in front —
scheme, host, and a port only if the address bar shows one. Unproxied, blank
is wrong: the adapter assumes https when the header is missing and refuses
http:// visitors.

**2. Bring it up.**

```bash
docker compose up -d --build
```

**3. Check it.**

```bash
curl http://localhost:8000/health      # {"status":"ok","dynamodb":"ok"}
curl -I http://localhost:7999/         # 200
docker compose ps                      # all three healthy
```

The backend and DynamoDB bind to `127.0.0.1` deliberately — a profile id is
the only credential the API takes, so only the frontend is exposed. Your
proxy only needs port 7999.

**4. Point DNS and the proxy at it.**

- Pi-hole: a local DNS record, `training.jmedia` → the server's LAN IP.
- Nginx Proxy Manager: new Proxy Host, domain `training.jmedia`, scheme
  `http`, forward to the server's LAN IP, port `7999`. Use the LAN IP rather
  than `localhost` — NPM in a container resolves `localhost` to itself.

**5. Open it, create a profile, done.**

### Keeping it updated

`docker-compose.ghcr.yml` runs Watchtower alongside the published images. It
watches the tag each container is running and redeploys when that tag's
digest changes, so a push to `main` reaches the machine on its own. It only
touches containers carrying
`com.centurylinklabs.watchtower.enable` -- the three app services do,
DynamoDB deliberately does not.

Pinning a version or a sha as `IMAGE_TAG` is how you opt out: those never
move, so Watchtower finds nothing to do. `latest` and `japanese` are the
moving tags.

It needs the Docker socket, which is full control of the daemon. Fine on a
machine you own; think twice on a shared host.

### Afterwards

- **Reboots** are handled: every long-running service is `unless-stopped`, so
  Docker brings them back. `dynamodb-init` does not re-run, which is correct —
  the table is already in the volume.
- **Backups.** All data is in the `train-hard-dynamodb-data` volume. To copy
  it out:
  ```bash
  docker run --rm -v train-hard-dynamodb-data:/data -v "$PWD":/backup alpine \
    tar czf /backup/hard-backup.tar.gz -C /data .
  ```
- **Updating.** `git pull && docker compose up -d --build`. The volume is
  untouched, so your data stays.
- **Service workers need HTTPS**, so over plain HTTP you get the app and the
  home-screen icon but no offline caching. The browser still caches all JS and
  CSS for a year regardless, so this costs you offline, not speed.

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

`npm run check` is `svelte-check`, `npm test` is Vitest. All four of these
gates run on every push and pull request; see `.github/workflows/ci.yml`,
which also brings the whole stack up from a clean checkout, logs a set end to
end, and asserts the data survives a restart.

## CI/CD

`.github/workflows/ci.yml` runs on every push to `main` or `japanese`, every
pull request, and every `v*` tag.

| Job | What it does |
| --- | --- |
| Backend tests | `pytest` inside the image the app actually ships, so a dependency missing from the runtime fails here rather than in production |
| Frontend checks | `npm ci`, `svelte-check`, `prettier`/`eslint`, Vitest |
| Stack smoke test | Brings the whole stack up from a clean checkout, asserts the backend reached DynamoDB and the tables exist, logs a set at 80.1 kg end to end, restarts and checks the data survived, then checks every page serves 200 |
| Publish images | Builds and pushes `backend` and `frontend` to GHCR |

The publish job `needs` all three gates, so nothing ships unless the tests
pass. It skips pull requests entirely.

### Images

Pushed to `ghcr.io/<owner>/<repo>/backend` and `.../frontend`, tagged with the
branch name, the full commit sha, and — on `main` — `latest`. A `v1.2.0` tag
also produces `1.2.0` and `1.2`.

The two branches build the same app with different interface strings, so
their images never share a tag: an update must not quietly change the
language. `main` owns `latest`; `japanese` has its own branch tag, and a
release cut from it is suffixed so it cannot overwrite the English one.
Every image also carries a `net.train-hard.ui-language` label.

| Tag | What |
| --- | --- |
| `latest` | English, tracking `main` |
| `japanese` | Japanese, tracking that branch |
| `1.2.0` | an English release |
| `1.2.0-ja` | the same release, Japanese |
| `<sha>` | exactly one build |

They are private by default; make them public, or `docker login ghcr.io`
first. To run them instead of building locally:

```bash
IMAGE_REPO=ghcr.io/<owner>/<repo>   docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up
```

`IMAGE_TAG` picks the version (defaults to `latest`); pin a release or a
commit sha for a reproducible run. DynamoDB, the table init and the volume
still come from `docker-compose.yml`.

Nothing deploys to a server — there is no hosting target configured. The
pipeline's output is tested, tagged images.

## Resetting the database

Data lives in a named volume, `train-hard-dynamodb-data`, so it survives
`docker compose down` and restarts. To wipe it:

```bash
docker compose down -v
```

`-v` removes the volume. The next `up` recreates the table empty. To wipe the
data but keep the images:

```bash
docker compose down -v && docker compose up
```

## Seeding data

Put a JSON dump in `seed-data/` and run:

```bash
docker compose --profile seed run --rm seed /data/dump.json --profile-id <profile-uuid>
```

The script accepts app-shaped items, the output of `aws dynamodb scan`, and
newline-delimited S3 table exports. `--profile-id` rewrites each item's owner,
which an export from AWS needs since `user_id` there was a Cognito username.
Add `--dry-run` to check parsing without writing. See
[seed-data/README.md](seed-data/README.md).

Get a profile's id from `http://localhost:8000/api/profiles`.

## Installing it on a phone

The app ships a web manifest and a service worker, so a phone can install it
to the home screen and it opens without browser chrome. Reach it over your
network at `http://<this-machine>:3000` -- `FRONTEND_BIND` is `0.0.0.0` for
exactly this.

The service worker caches the app's own assets, so the interface loads
instantly and survives a bad connection. It deliberately does **not** cache
anything under `/api`: showing a stale set list would be worse than showing
an error. Logging a set still needs the backend reachable; true offline
logging would need a sync queue, which this does not attempt.

Browsers only register service workers over HTTPS or on `localhost`, so
installing from another device over plain HTTP gets the manifest but not the
offline caching. Put it behind a TLS-terminating proxy if you want both.

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

## Configuration

Everything is an environment variable with a default; `.env.example`
documents all of them. The ones that matter:

| Variable | Default | Notes |
| --- | --- | --- |
| `HARD_API` | `http://backend:8000/api` | Where the SvelteKit server finds the backend. Note the `/api` suffix. |
| `DYNAMODB_ENDPOINT_URL` | `http://dynamodb:8000` | Set in compose. **Unset it and boto3 talks to real AWS instead** — that switch is the only difference between local and deployed storage. |
| `DYNAMO_TABLE_NAME` | `hardResources` | Must match what `scripts/init_tables.py` creates. |
| `AWS_REGION` | `eu-west-2` | Dummy locally, but boto3 will not sign without it. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `local` / `local` | Dummy. DynamoDB Local ignores them; boto3 requires them to exist. |
| `ORIGIN` | `http://localhost:3000` | The browser-facing URL. `adapter-node` checks form POSTs against it and answers 403 if it does not match. Blank it behind a reverse proxy to use the headers below instead, which is what lets http and https work at once. |
| `PROTOCOL_HEADER` | `x-forwarded-proto` | Read only when `ORIGIN` is blank. |
| `HOST_HEADER` | `x-forwarded-host` | Read only when `ORIGIN` is blank. |
| `WATCHTOWER_POLL_INTERVAL` | `3600` | Seconds between update checks, with the GHCR compose file. |
| `FRONTEND_HOST_PORT` | `3000` | |
| `FRONTEND_BIND` | `0.0.0.0` | Published to the network so a phone can reach it. Set to `127.0.0.1` for this machine only. |
| `BACKEND_HOST_PORT` | `8000` | Bound to 127.0.0.1. A profile id is the only credential the API takes, so it is deliberately not reachable from the network. |
| `DYNAMODB_HOST_PORT` | `8001` | 8001 because the backend has 8000. Bound to 127.0.0.1. |

No secrets are committed, and none are needed — the only credentials in the
stack are the dummy values above.

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
`TagJoin`, `BodyWeight`, and `Profile`. Profiles are stored under a reserved
`__system__` owner so the registry can be listed before a profile has been
chosen.

`infra-legacy/serverless.yml` remains the canonical schema definition;
`scripts/init_tables.py` mirrors it.

## Troubleshooting

**Port already in use.** Copy `.env.example` to `.env` and change the
`*_HOST_PORT` values.

**`dynamodb-init` exits non-zero.** It waits 60 s for DynamoDB. Check
`docker compose logs dynamodb` — if it reports a permissions error on `/data`,
the volume predates the `user: root` setting; `docker compose down -v` clears it.

**Backend is unhealthy.** `curl http://localhost:8000/health` reports whether
it is DynamoDB that is unreachable. `docker compose logs backend` has the rest.

**Frontend 500s on every page.** Usually `HARD_API` pointing somewhere wrong.
It needs the `/api` suffix and must use the service name `backend`, not
`localhost`, from inside the container.

**403 "Cross-site POST form submissions are forbidden".** The origin the
server believes it is serving does not match the one the browser sent.

With `ORIGIN` set, it must be exactly the scheme, host and port in the
address bar -- so one fixed value can serve http:// or https://, never both.
Behind a reverse proxy, blank it instead:

```bash
ORIGIN=
```

and the origin is read per request from `PROTOCOL_HEADER` and `HOST_HEADER`
(`x-forwarded-proto` and `x-forwarded-host` by default), which both schemes
satisfy at once. That also makes the profile cookie `Secure` on exactly the
requests that are secure, which is the other half of the symptom: a Secure
cookie delivered over http is discarded, and selecting a profile then appears
to do nothing.

Blank `ORIGIN` only behind something that actually sets those headers.
Unproxied, the adapter assumes https when the header is missing and an
http:// visitor is refused.

**Changes not appearing.** In production mode the app is a built bundle;
either rebuild (`docker compose up --build`) or use dev mode.
