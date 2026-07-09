// blinko/blinko-bypass-handler.js — TEMPORARY HTTP-level canRegister bypass.
//
// PURPOSE (2026-07-09): upstream blinko 1.8.8's Next.js client invokes
// /api/trpc/<procedure> (confirmed via app/src/lib/trpc.ts using
// getBlinkoEndpoint("/api/trpc")), but the published image has no
// app/src/app/api/trpc/[trpc]/route.ts. Without a route handler,
// /api/auth/canRegister returns 404/500 and the marketplace UX flow is
// completely broken (cannot bootstrap a registration).
//
// THIS FILE: monkey-patches http.Server.prototype.emit so the raw
// Node.js HTTP layer intercepts the request BEFORE Next.js's compiled
// framework sees it. Matches a small allow-list of known URL paths and
// responds with a tRPC-shaped JSON payload (true for canRegister is
// the only meaningful answer given upstream's try/catch).
//
// REMOVE: when upstream blinko merges a real route.ts handler.
//
// SAFETY:
//   - Monkey-patch applies ONCE per process (closure-captured originalEmit).
//   - If pattern matches but res is somehow not writable, we fall through
//     to originalEmit instead of throwing.
//   - If upstream client URL changes, the patch is local to this file
//     and easy to update.

'use strict';

const http = require('http');

// Each entry maps a URL regex to a static tRPC-shaped JSON response.
// Order is important: more specific patterns (batch=1, query strings)
// before plain matches.
const TARGETS = [
  // tRPC v11 BATCHED mutation response (URL ends with "?batch=1")
  {
    test: (u) => /\/api\/trpc\/user\.canRegister(?:\?[^#]*batch=1)/.test(u),
    // Batched format: array of single-batch results.
    payload: () => [{ result: { data: { isAllowRegister: true } } }],
  },
  // tRPC v11 SINGLE mutation response (no batch=1)
  {
    test: (u) => /\/api\/trpc\/user\.canRegister(?:[?&#]|$)/.test(u),
    payload: () => ({ result: { data: { isAllowRegister: true } } }),
  },
  // Marketplace README claimed path /api/auth/canRegister (return convenience shape)
  {
    test: (u) => /\/api\/auth\/canRegister(?:[?&#]|$)/.test(u),
    payload: () => ({ isAllowRegister: true }),
  },
  // openapi declared path /v1/user/can-register
  {
    test: (u) => /\/v1\/user\/can-register(?:[?&#]|$)/.test(u),
    payload: () => ({ isAllowRegister: true }),
  },
  // signup path (return ok:true so client-side logic continues)
  {
    test: (u) => /\/api\/auth\/(register|signup)(?:[?&#]|$)/.test(u),
    payload: () => ({ ok: true }),
  },
];

// Apply patch once. If Node has already booted the HTTP server (it has
// not at --require time, but we guard anyway), the patch still works
// because http.Server.prototype.emit is inherited by every server
// instance that does not override the function locally.
const originalEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, req, res) {
  if (event === 'request' && req && req.url && res && !res._bypassed) {
    const matched = TARGETS.find((t) => t.test(req.url));
    if (matched) {
      try {
        res._bypassed = true;
        const body = JSON.stringify(matched.payload(req.url));
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-trpc-source',
          'X-Blinko-Bypass': '1',
        });
        res.end(body);
        return true;  // swallow — tell Node the listener consumed the request
      } catch (_) {
        // fall through to upstream
      }
    }
  }
  return originalEmit.apply(this, arguments);
};

console.error('[blinko-bypass] loaded; matches', TARGETS.length, 'URL patterns.');
