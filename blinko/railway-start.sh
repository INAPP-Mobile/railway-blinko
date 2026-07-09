#!/bin/sh
# Railway-specific startup wrapper for blinko (docker.io/blinkospace/blinko:1.8.8).
#
# Chain (2026-07-09):
#   1. npx prisma migrate deploy   (creates config table via upstream migrations)
#   2. node /app/blinko-bootstrap  (idempotent UPSERT isAllowRegister=true)
#   3. node server/seed.js         (upstream seed)
#   4. exec node --require /app/blinko-trace.js server/index.js
#        (TEMPORARY diagnostic preload. Remove once /api/auth/canRegister is 200.)

set -e

echo "[railway-blinko] step 1/4: prisma migrate deploy"
npx prisma migrate deploy
echo "Current Environment: $NODE_ENV"

echo "[railway-blinko] step 2/4: idempotent isAllowRegister=true bootstrap"
node /app/blinko-bootstrap.js

echo "[railway-blinko] step 3/4: seed"
node server/seed.js

echo "[railway-blinko] step 4/4: server (with blinko-trace preload)"
exec node --require /app/blinko-trace.js server/index.js
