# Troubleshooting

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

Behind a proxy, check the override file is actually in the command:

```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d
```

Without it the origin is a fixed URL, and a fixed URL cannot match a proxied
domain it was not set to. Setting `ORIGIN=` blank in `.env` does the same
job, but only if the line is there and empty — deleting or commenting it out
falls back to the localhost default and looks the same in an editor.

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

**Selecting a profile does nothing.** The same cause as the 403 above — the
form POST is being refused, or the cookie that carries the choice is being
discarded as `Secure` over plain http. See
[configuration](configuration.md#the-origin-in-detail).

**Changes not appearing.** In production mode the app is a built bundle;
either rebuild (`docker compose up --build`) or use
[dev mode](../.github/CONTRIBUTING.md#dev-mode).

**Nothing above matches.** Open an
[issue](https://github.com/joecrockett5/train-hard/issues/new/choose) with the
output of `docker compose ps` and the relevant `docker compose logs`.
