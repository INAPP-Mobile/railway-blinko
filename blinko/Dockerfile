FROM docker.io/blinkospace/blinko:1.8.8

# rebuild-marker: 2026-07-09T2320-bust-cache
LABEL org.opencontainers.image.source="https://github.com/INAPP-Mobile/railway-blinko"

# Railway-specific files layered onto the upstream image:
#   blinko-bootstrap.js:        idempotent UPSERT of config.isAllowRegister
#   blinko-bypass-handler.js:   HTTP-level monkey-patch intercepting
#                               /api/trpc/user.canRegister + /api/auth/canRegister
#                               for upstream blinko 1.8.8 (missing /api/trpc route).
#                               TEMPORARY — remove once upstream merges a real
#                               route.ts handler at app/src/app/api/trpc/[trpc]/.
#   railway-start.sh:           ordered startup chain (prisma, bootstrap, seed, server)
#
# Cache-bust (2026-07-09T2320): real-content RUN forces Railway's docker
# build cache to invalidate this layer + every downstream layer. Earlier
# the rebuild-marker comment did NOT bust hash because Docker layer
# hashing is keyed off Dockerfile instruction text + source-file digest,
# not comments. This RUN changes hash table from here downward.
RUN echo "bust-cache-$(date +%s)" > /tmp/bust.txt
COPY blinko-bootstrap.js        /app/blinko-bootstrap.js
COPY blinko-bypass-handler.js   /app/blinko-bypass-handler.js
COPY railway-start.sh           /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

# Override CMD (preserves upstream ENTRYPOINT first).
CMD ["/usr/local/bin/dumb-init", "--", "/bin/sh", "-c", "/app/railway-start.sh"]

ENV PORT=1111
EXPOSE 1111
