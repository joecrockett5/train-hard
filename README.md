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
| http://localhost:8000/docs | Backend API docs (Swagger) |
| http://localhost:8000/health | Backend health + DynamoDB reachability |
| http://localhost:8001 | DynamoDB Local |

## Profiles

There are **no passwords**. A profile is just a name, and picking one selects
which data you see — workouts, exercises and sets are partitioned per profile.

Visiting any page without a profile selected redirects to `/profiles`, where
you can pick an existing one or create a new one. The choice is stored in a
`profileId` cookie; the nav sheet (the **+** button, bottom right) has a
switch-profile option.

This replaces the Cognito user pool the AWS version used. See
[infra-legacy/README.md](infra-legacy/README.md) for what was removed.

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
nor any credentials.

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
| `FRONTEND_HOST_PORT` | `3000` | |
| `BACKEND_HOST_PORT` | `8000` | |
| `DYNAMODB_HOST_PORT` | `8001` | 8001 because the backend has 8000. |

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
`TagJoin`, and `Profile`. Profiles are stored under a reserved `__system__`
owner so the registry can be listed before a profile has been chosen.

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

**Changes not appearing.** In production mode the app is a built bundle;
either rebuild (`docker compose up --build`) or use dev mode.
