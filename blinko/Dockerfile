FROM docker.io/blinkospace/blinko:1.8.8

# rebuild-marker: 2026-07-09T2245-trace-rolled-back
LABEL org.opencontainers.image.source="https://github.com/INAPP-Mobile/railway-blinko"

# Railway-specific files layered onto the upstream image:
COPY blinko-bootstrap.js /app/blinko-bootstrap.js
COPY railway-start.sh    /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

# Override CMD (preserves upstream ENTRYPOINT first).
CMD ["/usr/local/bin/dumb-init", "--", "/bin/sh", "-c", "/app/railway-start.sh"]

ENV PORT=1111
EXPOSE 1111
