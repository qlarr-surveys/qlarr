FROM --platform=$BUILDPLATFORM node:24-alpine AS xx-node


FROM xx-node AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN  npm run build


FROM caddy:alpine

COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=builder /app/build /usr/share/caddy

EXPOSE 80
EXPOSE 443

COPY --chmod=755 entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
