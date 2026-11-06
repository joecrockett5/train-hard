#!/bin/sh
set -e

# An empty ORIGIN means "work the origin out from the proxy's headers".
#
# That is what docker-compose.proxy.yml sets and what the README tells you to
# put in .env, because it is the only way http:// and https:// can both work
# at once -- a fixed ORIGIN matches one of them and answers 403 to every form
# POST from the other.
#
# adapter-node reads an *absent* ORIGIN that way, and since 5.3 refuses a
# present-but-empty one outright: the server exits on boot with "Invalid
# ORIGIN: ''" and the container restart-loops. Blanking a variable and
# removing it are the same intent, so this makes them the same thing, and the
# documented setup keeps working whatever the adapter decides next.
[ -n "${ORIGIN:-}" ] || unset ORIGIN

exec node build/index.js
