FROM --platform=$BUILDPLATFORM node:24-alpine AS xx-node


FROM xx-node AS builder

# Build context is the REPO ROOT (not frontend/), so the shared source consumed
# via the @qlarr/design-core vite alias (../shared/design-core/src) resolves.
# Build with:  docker build -f frontend/Dockerfile .  (CI passes context: .)
WORKDIR /app

# Shared source first (frontend transpiles it directly via the vite alias).
COPY shared/design-core ./shared/design-core

COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM caddy:alpine

COPY frontend/Caddyfile /etc/caddy/Caddyfile

COPY --from=builder /app/frontend/build /usr/share/caddy

EXPOSE 80
EXPOSE 443

COPY --chmod=755 frontend/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
