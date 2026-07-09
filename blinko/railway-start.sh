#!/bin/sh
# Railway-specific startup wrapper for blinko (docker.io/blinkospace/blinko:1.8.8).
#
# Chain (2026-07-09 — trace instrumentation was rolled back on 2026-07-09T2245):
#   1. npx prisma migrate deploy
#   2. node /app/blinko-bootstrap.js  (idempotent UPSERT isAllowRegister=true)
#   3. node server/seed.js            (upstream seed)
#   4. exec node server/index.js      (upstream main server)

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
