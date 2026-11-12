# Deployment

Running train-hard somewhere other than your laptop: on a home server behind a
reverse proxy, keeping it updated, backing it up, and installing it on a phone.

- [Running it on a server](#running-it-on-a-server)
- [Keeping it updated](#keeping-it-updated)
- [Afterwards](#afterwards)
- [Published images](#published-images)
- [CI/CD](#cicd)
- [Resetting the database](#resetting-the-database)
- [Seeding data](#seeding-data)
- [Installing it on a phone](#installing-it-on-a-phone)

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
```

**2. Add the proxy override to the command.**

```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d --build
```

The origin is the thing that catches people. SvelteKit compares it against
the `Origin` header on every form POST, and selecting or creating a profile
is a form POST. Get it wrong and those silently do nothing — a 403 the UI
does not surface.

`docker-compose.proxy.yml` works it out per request from the proxy's own
headers, which is why it is a file you add rather than a value you set.
http:// and https:// then both work at the same time; a fixed URL matches
one of them and refuses the other. It also marks the profile cookie `Secure`
on exactly the requests that are secure — a Secure cookie sent over http is
discarded by the browser, which looks like selecting a profile doing nothing
at all.

Without the override, `ORIGIN` is a fixed URL: the default is localhost, and
you set it in `.env` for anything else. It must match the address bar
exactly — scheme, host, and a port only if one is shown. Unproxied that is
what you want, because with no proxy header the adapter assumes https and
would refuse plain http visitors.

Setting `ORIGIN=` blank in `.env` does the same job as the override file,
but a line that is deleted or commented out instead of blanked falls back to
the localhost default and looks identical in an editor. The override file
cannot be got subtly wrong.

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

## Keeping it updated

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

## Afterwards

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

## Published images

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

To run them instead of building locally, with no configuration:

```bash
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d
```

`IMAGE_REPO` defaults to this project's own packages, so a clone pulls the
published build; set it to run a fork's images instead. `IMAGE_TAG` picks
which build and which language — `latest` by default, see the table above —
and pinning a release or a commit sha is how you stop Watchtower moving you
on. DynamoDB, the table init and the volume still come from
`docker-compose.yml`.

**GHCR packages are private until you say otherwise.** Anyone pulling a
private one needs `docker login ghcr.io` with a token that can read
packages; make them public (Packages → the package → Package settings →
Change visibility) and the command above works for anybody, unauthenticated.

Nothing deploys to a server — there is no hosting target configured. The
pipeline's output is tested, tagged images.

## CI/CD

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push
to `main` or `japanese`, every pull request, and every `v*` tag.

| Job | What it does |
| --- | --- |
| Backend tests | `pytest` inside the image the app actually ships, so a dependency missing from the runtime fails here rather than in production |
| Frontend checks | `npm ci`, `svelte-check`, `prettier`/`eslint`, Vitest |
| Stack smoke test | Brings the whole stack up from a clean checkout, asserts the backend reached DynamoDB and the tables exist, logs a set at 80.1 kg end to end, restarts and checks the data survived, then checks every page serves 200 |
| Publish images | Builds and pushes `backend` and `frontend` to GHCR |

The publish job `needs` all three gates, so nothing ships unless the tests
pass. It skips pull requests entirely.

A `v*` tag additionally runs
[`.github/workflows/release.yml`](../.github/workflows/release.yml), which
cuts a GitHub Release with notes generated from the commits since the last
tag. The images for that release come from the CI workflow above; the release
job only publishes the notes.

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
[seed-data/README.md](../seed-data/README.md).

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
