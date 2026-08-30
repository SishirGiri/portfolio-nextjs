# ── Neon Drive realtime service (WebSocket game server) ───
# Runs realtime/server.ts with tsx — no build step keeps the
# image identical to dev behavior.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production REALTIME_PORT=3001
RUN addgroup -S neondrive && adduser -S neondrive -G neondrive
COPY --from=deps --chown=neondrive:neondrive /app/node_modules ./node_modules
COPY --chown=neondrive:neondrive realtime ./realtime
COPY --chown=neondrive:neondrive prisma ./prisma
COPY --chown=neondrive:neondrive src/server ./src/server
COPY --chown=neondrive:neondrive package.json tsconfig.json ./
USER neondrive
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["npx", "tsx", "realtime/server.ts"]
