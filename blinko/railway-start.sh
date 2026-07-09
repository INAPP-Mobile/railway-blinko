#!/bin/sh
# Railway-specific startup wrapper for blinko (docker.io/blinkospace/blinko:1.8.8).
#
# Chain order matters (2026-07-09 fix from code-review): `prisma migrate deploy`
# must run BEFORE our idempotent UPSERT, otherwise the `config` table doesn't
# exist yet on fresh deploys and the UPSERT silently fails (the JS script's
# catch swallows it). Reordered so the row is guaranteed to land.
#
#   1. npx prisma migrate deploy   (creates config table via upstream migrations)
#   2. node /app/blinko-bootstrap  (UPSERT isAllowRegister=true -- now succeeds)
#   3. node server/seed.js         (upstream seed)
#   4. exec node server/index.js   (upstream main server; `exec` keeps PID 1 = node)
#
# This script REPLACES the upstream /app/start.sh chain via CMD override. The
# upstream ENTRYPOINT (`/usr/local/bin/docker-entrypoint.sh`) is untouched and
# still runs first via the inherited CMD args.

set -e

echo "[railway-blinko] step 1/4: prisma migrate deploy"
npx prisma migrate deploy
echo "Current Environment: $NODE_ENV"

echo "[railway-blinko] step 2/4: idempotent isAllowRegister=true bootstrap"
node /app/blinko-bootstrap.js

echo "[railway-blinko] step 3/4: seed"
node server/seed.js

echo "[railway-blinko] step 4/4: server"
exec node server/index.js
