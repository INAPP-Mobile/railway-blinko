FROM docker.io/blinkospace/blinko:1.8.8

LABEL org.opencontainers.image.source="https://github.com/INAPP-Mobile/railway-blinko"

# Railway-specific: enable user registration idempotently.
# Upstream blinko has no BLINKO_ALLOW_REGISTER env var; canRegister() reads
# a `config` table row keyed `isAllowRegister`. Blinko-bootstrap.js runs an
# idempotent UPSERT (ON CONFLICT DO UPDATE) on every container start. We
# place it AFTER `prisma migrate deploy` in railway-start.sh so the `config`
# table exists when boot runs (avoids first-deploy UPSERT silently failing).
COPY blinko-bootstrap.js /app/blinko-bootstrap.js
COPY railway-start.sh /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

# Override CMD (preserves upstream ENTRYPOINT chain at /usr/local/bin/docker-entrypoint.sh,
# which still runs first with our new CMD args).
CMD ["/usr/local/bin/dumb-init", "--", "/bin/sh", "-c", "/app/railway-start.sh"]

# Blinko listens on port 1111 internally.
# Railway injects PORT for health checks and routing.
ENV PORT=1111

# Health check is configured in blinko/railway.json's
# `deploy.healthcheckPath: "/api/health"` + `healthcheckTimeout: 60` for
# Railway marketplace deploys. No HEALTHCHECK directive here to avoid
# conflicting timeouts against railway.json.

EXPOSE 1111
