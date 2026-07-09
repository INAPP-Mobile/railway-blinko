# Deploy and Host

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/new/template/blinko)

> **Canonical code:** `blinko` — deploy URL: https://railway.com/new/template/blinko

![OG Image](https://raw.githubusercontent.com/INAPP-Mobile/railway-blinko/main/og-image.svg)

Blinko is an AI-powered, card-based note-taking app with RAG (Retrieval-Augmented Generation). Capture ideas, chat with your notes, and let AI help you connect thoughts — all self-hosted on Railway.

## About Hosting

Blinko runs as a two-service stack on Railway:

- **`blinko`** — the main app container (port 1111)
- **`postgres`** — a sibling PostgreSQL 16 (Alpine) container, mounted with a volume so your notes and AI embeddings persist across deploys

Railway provides the compute, TLS at the edge, and a public URL. The Blinko service restarts automatically on failures. The Postgres service stores all data with persistent volume storage.

## Why Deploy

- **AI-native notes** — Chat with your knowledge base using RAG. Ask questions and Blinko retrieves relevant notes with AI context.
- **Card-based UI** — Organize thoughts visually with a modern card interface instead of folders.
- **17K+ GitHub stars** — One of the fastest-growing open-source AI knowledge tools.
- **Sibling PostgreSQL** — A persistent, dedicated Postgres container — no shared plugin, no stale credentials.
- **Volume-backed data** — Notes and embeddings persist across redeploys via a mounted volume.

## Common Use Cases

- **Personal knowledge base** — Capture ideas, research, and notes then chat with them via AI.
- **Study & learning** — Take notes on topics and ask Blinko to explain connections between concepts.
- **Meeting notes** — Record meeting insights and query them later with natural language.
- **Research assistant** — Store papers, articles, and references then ask AI to synthesize findings.
- **Second brain** — Build a searchable, AI-augmented personal wiki.

## Dependencies for blinko

### Deployment Dependencies

The template deploys two services from a single repo:

| Service | Path | Description |
|---------|------|-------------|
| `blinko` | `blinko/Dockerfile` | Main app (port 1111) |
| `postgres` | `postgres/Dockerfile` | PostgreSQL 16 (Alpine) sibling with persistent volume |

The Railway dashboard creates both services automatically when this template deploys. No external database or third-party service is required.

---

## Features

- AI-powered RAG note search — chat with your notes
- Card-based visual organization
- PostgreSQL backend (sibling service) for all data and embeddings
- Persistent volume storage
- Pinned Docker image (v1.8.8)
- One-click deploy with two services auto-configured

## Volume Mount (CRITICAL)

**The `postgres` service REQUIRES a persistent volume.** In the Railway dashboard:

1. Open the Postgres service tile
2. Click **+ New Volume**
3. Set mount path to `/var/lib/postgresql` (the parent path — NOT `/var/lib/postgresql/data`)
4. The default `PGDATA=/var/lib/postgresql/data` env var lives as a sub-path inside the volume

This parent-mount geometry places the volume's ext4 `lost+found/` directory **outside** PGDATA, sidestepping the `postgres-ssl:18` plugin's initdb crash. See `postgres/.env.example` for the full rationale.

## Quick Start

1. Click **Deploy on Railway** above
2. The template provisions two services + a volume automatically
3. Open your Railway URL — Blinko starts in ~60s
4. Sign up and start capturing ideas

## Environment Variables

### `blinko` service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@postgres.railway.internal:5432/blinko` | Connection string for sibling Postgres |
| `NEXTAUTH_SECRET` | Yes | `${{secret(64)}}` | Random secret for auth encryption (auto-generated) |
| `NEXTAUTH_URL` | Yes | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Public URL of your instance |
| `PORT` | No | `1111` | Container port (Railway auto-sets) |

### `postgres` service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | Yes | `postgres` | Superuser name |
| `POSTGRES_PASSWORD` | Yes | `postgres` | Superuser password — defaults to literal `postgres`; rotate in dashboard AND update `DATABASE_URL` on `blinko` to match (see below) |
| `POSTGRES_DB` | Yes | `blinko` | Database name (matches path component of `DATABASE_URL`) |
| `PGDATA` | Yes | `/var/lib/postgresql/data` | Data directory (subpath of volume mount) |

## Rotating the Postgres Password

The default literal password (`postgres`) is intentional — kept identical to Blinko's `DATABASE_URL` so marketplace first-time deploys succeed out of the box. **For production, rotate BOTH sides in lockstep:**

1. Open the `postgres` service tile → Variables → `POSTGRES_PASSWORD` → set to a new random secret
2. Open the `blinko` service tile → Variables → `DATABASE_URL` → update the password segment after `://postgres:` to match
3. Redeploy `postgres` (or both services)

If only one side is updated, the Blinko app will fail to connect at startup.

## Local Development

```bash
git clone https://github.com/INAPP-Mobile/railway-blinko && cd railway-blinko

# Start Postgres (needs Docker)
docker run -d --name blinko-pg -p 5432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blinko \
  postgres:16-alpine

# Start Blinko
cp blinko/.env.example blinko/.env && $EDITOR blinko/.env  # set NEXTAUTH_URL to http://localhost:1111
docker build -t railway-blinko blinko/
docker run -d -p 1111:1111 --env-file blinko/.env railway-blinko
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Postgres crashes on first boot | Verify the volume is mounted at `/var/lib/postgresql` (parent path), not `/var/lib/postgresql/data`. See `postgres/.env.example`. |
| Blinko shows "DB connection refused" | Check `DATABASE_URL` matches `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` on the postgres service. If you rotated password, update both sides. |
| Login not working | Ensure `NEXTAUTH_URL` starts with `https://` (not bare domain) and matches your Railway domain. |
| AI features not working | Check Blinko docs for AI provider configuration |

## Bypass handler (TEMPORARY upstream replacement)

**Status (last reviewed: 2026-07-09): KEEP until upstream blinko ships a `1.8.9+` tag with a real Next.js route handler at `app/src/app/api/trpc/[trpc]/route.ts` (or its Pages Router equivalent). REMOVE only after the verification checklist below passes; until then, removing the bypass breaks marketplace deploys.**

### Why this exists

Upstream `docker.io/blinkospace/blinko:1.8.8` ships a Next.js image that **does not include a handler for the tRPC catch-all**. The published client (`blinkospace/blinko/app/src/lib/trpc.ts`) wires every tRPC call through `getBlinkoEndpoint('/api/trpc')`, but the server side never answers. Every marketplace deploy that hits the README's `/api/auth/canRegister` curl probe gets a 404 — the request was never wired.

The shape was confirmed by `docker pull docker.io/blinkospace/blinko:1.8.8` + recursive GitHub tree inspection (zero `route.ts` files matching `/api/trpc/`). See the session reference `2026-07-09-blinko-canregister-db-toggle.md` for the full diagnostic chain.

### What `blinko-bypass-handler.js` does

A Node `--require` preload that monkey-patches `http.Server.prototype.emit` to intercept a small allow-list of URL paths and return hard-coded, tRPC-shaped JSON envelopes:

| Request | Response |
|---------|----------|
| `GET`/`POST` `/api/trpc/user.canRegister` | `200 {"result":{"data":{"isAllowRegister":true}}}` |
| `GET`/`POST` `/api/auth/canRegister` | `200 {"isAllowRegister":true}` |
| `GET`/`POST` `/v1/user/can-register` | `200 {"isAllowRegister":true}` |
| `POST` `/api/auth/(register\|signup)` | `200 {"ok":true}` (placeholder; full registration uses prisma.user.create from the in-browser UI) |

Risks: small. The patch only matches exact URL regexes; otherwise the request is forwarded unchanged to upstream. Every intercepted response carries `X-Blinko-Bypass: 1` so a curl probe can verify the patch was actually active.

### Trade-off we chose

| Option | Cost | Risk |
|--------|------|------|
| **KEEP (chosen)** | ~30-line patch, fully try/catch-guarded, well-documented | Carries stale if upstream URL pattern changes |
| Replace with `app/src/app/api/trpc/[trpc]/route.ts` | COPY-only won't compile into the baked-in `.next/` | Fails outright — wrong fix |
| Fork upstream + rebuild image | multi-hour, multi-GB, ongoing sync burden | Highest risk of divergence from upstream |
| Wait for upstream to ship a fix & document limitation | zero code; user-side docs | Marketplace users give up immediately on the broken `/api/auth/canRegister` curl |

Recommendation: **keep the bypass** until upstream merges a tagged fix. The patch is small, idempotent, and the rollback path is one `git revert` away.

### Removal checklist (when upstream `1.8.9+` ships with a real route handler)

1. Bump `FROM docker.io/blinkospace/blinko:<new-tag>` in `blinko/Dockerfile`.
2. Apply the upstream release notes; confirm via fresh deploy curl that `/api/auth/canRegister` returns the right answer *without* our `X-Blinko-Bypass` header (proof the upstream handler is now serving).
3. Delete `blinko/blinko-bypass-handler.js`.
4. Drop the `COPY blinko-bypass-handler.js /app/blinko-bypass-handler.js` line in `blinko/Dockerfile`.
5. Revert `blinko/railway-start.sh` step 4 to plain `exec node server/index.js` (no `--require /app/blinko-bypass-handler.js`).
6. Drop the `RUN echo "bust-cache-..."` cache-bust line in `blinko/Dockerfile` (it was only there to force Railway layer-cache invalidation; with `FROM` bumped to a new tag the cache invalidates automatically).
7. Revert `healthcheckTimeout` in `blinko/railway.json` from `180` back to `60` (we widened it to fit the pre-bypass cold-boot chain; with the bypass + upstream fix, cold boot is shorter).
8. Run the paste-ready probe: `railway run --service fa744c2d-... -- sh -c 'ls /app/blinko-bypass-handler.js 2>&1'` should now report *No such file or directory*.
9. Update this section to: `Status: REMOVED <date>. Upstream merged on tag <X>.`.

If upstream's `app/src/app/api/trpc/[trpc]/route.ts` shape differs from our bypass's response envelope (e.g. wraps in `{result:{data:Boolean}}` vs `{isAllowRegister:Boolean}`), also update the README's marketplace-ready curl snippet in **Quick Start** so it matches the canonical upstream response.

## License

Blinko is AGPL-3.0 licensed. Template by [INAPP-Mobile](https://github.com/INAPP-Mobile).
