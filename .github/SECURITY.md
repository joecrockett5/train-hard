# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest release | ✅ |
| Anything older | ❌ |

This is a small self-hosted project with one maintainer. Fixes land on `main`
(and are cherry-picked to `japanese`) and go out in the next release; there is
no backporting to older tags.

## Reporting a vulnerability

Please report privately rather than opening a public issue: use
**[GitHub's private vulnerability reporting](https://github.com/joecrockett5/train-hard/security/advisories/new)**,
which opens a draft advisory only the maintainer can see.

Include what you did, what happened, and what you expected. A proof of concept
helps but is not required.

Expect an acknowledgement within a week. There is no bounty.

## What is in scope

The things this project actually controls:

- The FastAPI backend and its DynamoDB access layer.
- The SvelteKit server, its `/api/*` routes, and the cookie handling.
- The compose files and the images published to GHCR.

## What is not

Some of this looks alarming and is deliberate; please read this before
reporting it.

- **There is no authentication.** A profile is a name, and the profile id is
  the only credential the API takes. This is by design for a single-household
  app on a private network — it replaced a Cognito user pool, and the README
  says so. Anyone who can reach the frontend can use any profile on it.
- **The backend and DynamoDB bind to `127.0.0.1`.** They are deliberately not
  reachable from the network; only the frontend is exposed. If you have
  published them yourself, that is a configuration choice, not a
  vulnerability.
- **The AWS credentials in the compose files are the literal string `local`.**
  DynamoDB Local ignores them and boto3 requires them to exist. They are not
  secrets.
- **Watchtower needs the Docker socket**, which is full control of the daemon.
  That compose file is opt-in and the deployment docs say as much.
- **`infra-legacy/`** is the old AWS deployment, kept for reference and not
  deployed by anything.

Anything that lets one profile read or write another's data, that lets a
request reach the backend without going through the SvelteKit server, or that
escapes a container, is in scope and worth reporting.
