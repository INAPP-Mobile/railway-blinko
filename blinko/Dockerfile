FROM docker.io/blinkospace/blinko:1.8.8

LABEL org.opencontainers.image.source="https://github.com/INAPP-Mobile/railway-blinko"

# Blinko listens on port 1111 internally.
# Railway injects PORT for health checks and routing.
ENV PORT=1111

# Health check via the API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-1111}/api/health" >/dev/null 2>&1 || exit 1

EXPOSE 1111
