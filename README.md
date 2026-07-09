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

## Railway marketplace

A **DRAFT** template derived from this repository lives on Railway's marketplace under workspace `b82233e8-ff27-4ca9-9a30-a7411337a2d9` (INAPP):

- **Template ID**: `8166b543-4dd0-4150-a0b0-d556b3c17d5e`
- **Auto-generated code**: `IdEPw3`
- **Current name**: `courteous-magic` (rename via dashboard editor before PUBLISHED)
- **Status**: `UNPUBLISHED` (draft per AGENTS.md rule 3)
- **Editor URL**: `https://railway.com/workspace/templates/8166b543-4dd0-4150-a0b0-d556b3c17d5e`

Pre-publish checklist (per `.agents/skills/railway-deployment/SKILL.md` and `dashboard-publish-form-template.md`):

1. Rename to a clean marketplace slug (`blinko` or similar) via the dashboard template editor.
2. Fill in the required README sections: `# Deploy and Host`, `## About Hosting`, `## Common Use Cases`, `## Dependencies`, `## Why Deploy` (lowercase appname in headings per the form skill).
3. Add a category enum value (e.g., `Other`).
4. Verify image URL serves raw SVG (see `2026-06-28-plausible-icon-url-fix.md`).
5. Confirm `/api/health` returns HTTP 200 on a fresh deploy from the draft's repo (warm-cache healthcheckTimeout is currently `180s`; tighten to `60s` after one warm cycle).
6. Only after all six pass, transition `UNPUBLISHED → PUBLISHED` via the dashboard.

The draft was created on 2026-07-09 from project `courteous-magic` (`74d36f1e-6fdc-4f34-b426-6f815b4e840c`) after re-sourcing the postgres sibling to `postgres:16-alpine` (image source — functionally equivalent to our submodule's `postgres/Dockerfile` since that file is `FROM postgres:16-alpine` verbatim). Live Prisma data in the postgres volume is preserved.

## License

Blinko is AGPL-3.0 licensed. Template by [INAPP-Mobile](https://github.com/INAPP-Mobile).
