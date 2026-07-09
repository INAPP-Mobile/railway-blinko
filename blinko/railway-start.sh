#!/bin/sh
# Railway-specific startup wrapper for blinko (docker.io/blinkospace/blinko:1.8.8).
#
# Runs our idempotent `isAllowRegister=true` UPSERT *after* `prisma migrate deploy`
# (so the `config` table exists for Blinko Prisma to upsert into), then continues
# with the upstream start.sh chain: seed → main server.
#
# This script REPLACES the upstream /app/start.sh chain via CMD override. The
# upstream ENTRYPOINT (`/usr/local/bin/docker-entrypoint.sh`) is untouched and
# still benefits from any signals/init it performs.

set -e

echo "[railway-blinko] applying isAllowRegister=true bootstrap (after migrations)..."
node /app/blinko-bootstrap.js

# Upstream start.sh contents follow verbatim so we don't regress any env logic.
echo "Current Environment: $NODE_ENV"
npx prisma migrate deploy
node server/seed.js
exec node server/index.js
