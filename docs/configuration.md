# Configuration

Everything is an environment variable with a default;
[`.env.example`](../.env.example) documents all of them. There is no `.env` to
write unless you want to change something — ports, mainly.

## The ones that matter

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
| `IMAGE_REPO` | this project's packages | Which GHCR namespace the `docker-compose.ghcr.yml` images come from. |
| `IMAGE_TAG` | `latest` | Which published build — and which UI language — to run. See [deployment](deployment.md#published-images). |

No secrets are committed, and none are needed — the only credentials in the
stack are the dummy values above.

## Compose files

Four files, composed rather than copied. `docker-compose.yml` is always first;
the others are overrides you add to the command.

| File | Add it when |
| --- | --- |
| `docker-compose.yml` | Always. DynamoDB, the table init, the backend, the frontend, the volume. |
| `docker-compose.dev.yml` | You want hot reload and the source bind-mounted. |
| `docker-compose.proxy.yml` | The app sits behind a reverse proxy and the origin has to be read per request. |
| `docker-compose.ghcr.yml` | You want the published images and Watchtower instead of a local build. |

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Ports

| Port | Service | Bound to |
| --- | --- | --- |
| 3000 | Frontend (production build) | `FRONTEND_BIND`, `0.0.0.0` by default |
| 5173 | Frontend (Vite dev server, dev mode only) | `FRONTEND_DEV_HOST_PORT` |
| 8000 | Backend | `127.0.0.1` |
| 8001 | DynamoDB Local | `127.0.0.1` |

If one is already taken, copy `.env.example` to `.env` and change the matching
`*_HOST_PORT`.

## The origin, in detail

This is the setting that most often goes wrong, because getting it wrong
produces silence rather than an error. SvelteKit's `adapter-node` compares
`ORIGIN` against the `Origin` header on every form POST, and selecting or
creating a profile is a form POST.

- **Unproxied.** Leave `ORIGIN` at a fixed URL matching the address bar
  exactly: scheme, host, and a port only if one is shown.
- **Behind a proxy.** Add `docker-compose.proxy.yml`, which blanks `ORIGIN`
  and derives it per request from `PROTOCOL_HEADER` and `HOST_HEADER`. http
  and https then both work, and the profile cookie is marked `Secure` on
  exactly the requests that are secure.

Blanking `ORIGIN` by hand in `.env` does the same job as the override file,
but only if the line is present and empty. A line that is deleted or
commented out falls back to the localhost default and looks identical in an
editor; the override file cannot be got subtly wrong.

Blank `ORIGIN` only behind something that actually sets those headers.
Unproxied, the adapter assumes https when the header is missing and an
http:// visitor is refused.
