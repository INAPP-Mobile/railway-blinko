#!/bin/sh
# Railway-specific startup wrapper for blinko (docker.io/blinkospace/blinko:1.8.8).
#
# Chain (2026-07-09):
#   1. npx prisma migrate deploy
#   2. node /app/blinko-bootstrap.js  (idempotent UPSERT isAllowRegister=true)
#   3. node server/seed.js            (upstream seed)
#   4. exec node --require /app/blinko-bypass-handler.js server/index.js
#        bypass-handler.js is HTTP-level monkey-patch on http.Server emit
#        that returns a tRPC-shaped response for /api/trpc/user.canRegister.
#        Required because upstream blinko 1.8.8's published image lacks
#        app/src/app/api/trpc/[trpc]/route.ts.

set -e

echo "[railway-blinko] step 1/4: prisma migrate deploy"
npx prisma migrate deploy
echo "Current Environment: $NODE_ENV"

echo "[railway-blinko] step 2/4: idempotent isAllowRegister=true bootstrap"
node /app/blinko-bootstrap.js

echo "[railway-blinko] step 3/4: seed"
node server/seed.js

echo "[railway-blinko] step 4/4: server (with HTTP bypass preload)"
exec node --require /app/blinko-bypass-handler.js server/index.js
