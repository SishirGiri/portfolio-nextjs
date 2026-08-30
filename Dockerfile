# ── Neon Drive web platform (Next.js) ──────────────────────
# Multi-stage build → small standalone runtime image.
#   docker build -t neondrive-web .
# See docs/neon-drive/08-DEPLOYMENT.md for the full stack.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma client generates without a live DB
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S neondrive && adduser -S neondrive -G neondrive
# standalone output bundles the server + minimal node_modules
COPY --from=build --chown=neondrive:neondrive /app/.next/standalone ./
COPY --from=build --chown=neondrive:neondrive /app/.next/static ./.next/static
COPY --from=build --chown=neondrive:neondrive /app/public ./public
# prisma engine + schema for migrations at container start
COPY --from=build --chown=neondrive:neondrive /app/prisma ./prisma
COPY --from=build --chown=neondrive:neondrive /app/node_modules/.prisma ./node_modules/.prisma
USER neondrive
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/game/health || exit 1
CMD ["node", "server.js"]
