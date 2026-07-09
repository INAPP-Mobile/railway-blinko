// Railway-specific bootstrap for blinko (docker.io/blinkospace/blinko:1.8.8).
// Idempotently UPSERTs the `config` row key='isAllowRegister' with value=true.
//
// This enables Blinko's `canRegister()` tRPC procedure
// (github.com/blinkospace/blinko/blob/main/server/routerTrpc/user.ts) to return
// true for new user signups. Without this row, the first-time deploy universe
// has no env or DB toggle, so every signup attempt throws
// "INTERNAL_SERVER_ERROR: not allow register".
//
// Why this script exists:
//   - Blinko's source has no BLINKO_ALLOW_REGISTER env var.
//   - The only override is the `config` table row.
//   - We're a marketplace template; making this part of boot means future
//     deploys "just work" for new users.
//
// Why idempotent and runs on every boot:
//   - ON CONFLICT DO UPDATE makes the row safe to re-run.
//   - No need to remember to delete this script once the row is seeded.
//   - Cost: ~300ms startup latency, one cheap UPSERT.

'use strict';

(async () => {
  let prisma;
  try {
    // Upstream image installs @prisma/client at /app/node_modules/@prisma/client
    // (NOT under /app/server/node_modules — that 404s). Absolute require avoids
    // depending on process.cwd() or any node_modules walk.
    const { PrismaClient } = require('/app/node_modules/@prisma/client');
    prisma = new PrismaClient();
  } catch (e) {
    console.warn(
      `[railway-blinko] bootstrap: @prisma/client unavailable — ${e.message}`,
    );
    return; // non-fatal: server still starts
  }

  try {
    // Postgres ON CONFLICT to upsert. `config.value` must be the JSON syntax
    // Blinko's user.ts expects: `{"value": true}` (note: lowercase JSON keys).
    const rows = await prisma.$executeRawUnsafe(
      `INSERT INTO "config" ("key", "config") VALUES ('isAllowRegister', '{"value": true}') ON CONFLICT ("key") DO UPDATE SET "config" = EXCLUDED."config"`,
    );
    console.log(
      `[railway-blinko] bootstrap: isAllowRegister UPSERT applied (${rows} row)`,
    );
  } catch (e) {
    // Non-fatal: if the `config` table doesn't exist yet (older Blinko schema),
    // or we hit a transient DB error, log and continue so blinko still boots.
    console.warn(
      `[railway-blinko] bootstrap: skipped — ${(e.message || String(e)).slice(
        0,
        200,
      )}`,
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (_) {
      // ignore disconnect errors
    }
  }
})().finally(() => {
  // Force-exit AFTER the IIFE chain finishes (UPSERT + finally + disconnect).
  //
  // CRITICAL BUG-LASS: there are TWO common footguns here:
  //   1. Top-level `process.exit(0)` BEFORE await resolves → process exits,
  //      UPSERT never lands. (Hit 2026-07-09; fixed via .finally chain.)
  //   2. Missing `()` between `})` and `.finally` → .finally is called on the
  //      FUNCTION OBJECT itself (which has no .finally method), not on the
  //      returned Promise. Result: TypeError at module load, server crashes
  //      before prisma migrate deploy even gets a chance. (Hit 2026-07-09;
  //      fixed by adding the `()` invocation.)
  //
  // Both must be present: `})()` invokes the async IIFE → returns Promise →
  // `.finally()` runs after the awaited UPSERT + finally{} + disconnect.
  process.exit(0);
});
