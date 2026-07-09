FROM docker.io/blinkospace/blinko:1.8.8

LABEL org.opencontainers.image.source="https://github.com/INAPP-Mobile/railway-blinko"

# Railway-specific: enable user registration idempotently.
# Upstream blinko has no BLINKO_ALLOW_REGISTER env var; canRegister() reads a
# `config` table row keyed `isAllowRegister`. We run an idempotent UPSERT on
# every container start (ON CONFLICT DO UPDATE) — see blinko-bootstrap.js.
COPY blinko-bootstrap.js /app/blinko-bootstrap.js
COPY railway-start.sh /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

# Override CMD (preserves upstream ENTRYPOINT chain). The wrapper runs bootstrap
# AFTER `prisma migrate deploy` (so `config` table exists), then continues with
# the upstream main server startup. See railway-start.sh.
CMD ["/usr/local/bin/dumb-init", "--", "/bin/sh", "-c", "/app/railway-start.sh"]

# Blinko listens on port 1111 internally.
# Railway injects PORT for health checks and routing.
ENV PORT=1111

# Health check via the API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-1111}/api/health" >/dev/null 2>&1 || exit 1

EXPOSE 1111
