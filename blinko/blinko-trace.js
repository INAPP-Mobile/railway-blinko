// blinko-trace.js — temporary diagnostic loader.
//
// PURPOSE (2026-07-09): /api/auth/canRegister is throwing 500 in the running
// blinko container. Logs are unreadable from GraphQL, so we inject this
// --require preload script which monkey-patches PrismaClient at the
// cache level so every database call from upstream blinko logs to stderr.
// Plus process-level handlers catch unhandled rejections.
//
// USAGE: invoked via `node --require /app/blinko-trace.js server/index.js`
// (added to blinko/railway-start.sh, see line 33).
//
// REMOVE: once /api/auth/canRegister returns 200, delete this file +
// the --require flag from railway-start.sh + the COPY line from Dockerfile.

'use strict';

const TAG = '[blinko-trace]';
const MAX = 600;

function cap(s) {
  return (s == null ? String(s) : String(s)).slice(0, MAX);
}

console.error(`${TAG} loading. PID=${process.pid} node=${process.version} argv=${cap(JSON.stringify(process.argv))}`);

// Process-level diagnostics: anything that escapes the tRPC layer.
process.on('unhandledRejection', (reason) => {
  console.error(`${TAG} UNHANDLED REJECTION: ${cap(reason && reason.stack || reason && reason.message || reason)}`);
});
process.on('uncaughtException', (err, origin) => {
  console.error(`${TAG} UNCAUGHT EXCEPTION (${origin}): ${cap(err && err.stack || err && err.message || err)}`);
});

let TracedPrismaClient;
try {
  const path = require.resolve('/app/node_modules/@prisma/client');
  const realMod = require(path);
  const Real = realMod.PrismaClient;

  // Wrap EVERY findFirst / count / findUnique / findMany / executeRaw /
  // $transaction / $connect / $disconnect call so its args + result (or
  // thrown error stack) appear in the deploy log.
  function tracer(name) {
    return async function (ctx) {
      const t0 = Date.now();
      try {
        const result = await ctx.query(ctx.args);
        console.error(
          `${TAG} prisma.${name} ${cap(ctx.model || '(no model)')} ` +
          `args=${cap(JSON.stringify(ctx.args))} ` +
          `ms=${Date.now() - t0} ` +
          `-> ${cap(JSON.stringify(result))}`
        );
        return result;
      } catch (e) {
        console.error(
          `${TAG} prisma.${name} ${cap(ctx.model || '(no model)')} ` +
          `args=${cap(JSON.stringify(ctx.args))} ` +
          `THREW ${cap(e && e.stack || e && e.message || e)}`
        );
        throw e;
      }
    };
  }

  TracedPrismaClient = function (options) {
    console.error(`${TAG} new PrismaClient({}, ${Object.keys(options || {}).join(',')})`);
    const inner = new Real(options);
    return inner.$extends({
      query: {
        findFirst: tracer('findFirst'),
        findFirstOrThrow: tracer('findFirstOrThrow'),
        findUnique: tracer('findUnique'),
        findUniqueOrThrow: tracer('findUniqueOrThrow'),
        findMany: tracer('findMany'),
        count: tracer('count'),
        create: tracer('create'),
        update: tracer('update'),
        delete: tracer('delete'),
        upsert: tracer('upsert'),
        executeRaw: tracer('executeRaw'),
        queryRaw: tracer('queryRaw'),
      },
    });
  };
  TracedPrismaClient.prototype = Real.prototype;
  // Preserve static fields/methods the upstream code might use.
  Object.setPrototypeOf(TracedPrismaClient, Real);

  // Replace the export on the require-cache entry. Subsequent
  // `require('@prisma/client')` calls from upstream blinko will receive
  // our traced PrismaClient.
  realMod.PrismaClient = TracedPrismaClient;
  console.error(`${TAG} PrismaClient child-replaced at ${path}`);
} catch (e) {
  console.error(`${TAG} PrismaClient wrap FAILED: ${cap(e && e.stack || e.message)}`);
  // intentionally do NOT rethrow — blinko must still boot if our wrapper fails.
}

console.error(`${TAG} loader complete.`);
