# ── Stage 1: Prune monorepo ──────────────────────────────────────────

FROM oven/bun:1.3.5 AS pruner
WORKDIR /app
# Copy lockfile + package.jsons first, install turbo
COPY package.json bun.lock turbo.json ./
RUN bun install 
# Copy everything else, then prune
COPY . .
RUN bun run turbo prune web --docker

# ── Stage 2: Install & Build ─────────────────────────────────────────
FROM oven/bun:1.3.5 AS builder
WORKDIR /app

# Copy pruned lockfile + package.jsons (cache layer)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install 

# Then copy full source
COPY --from=pruner /app/out/full/ .

# Build Next.js (standalone mode)
ENV NODE_ENV=production

ARG DATABASE_URL
ARG DOMAIN
ENV DATABASE_URL=$DATABASE_URL
ENV DOMAIN=$DOMAIN
RUN cd apps/web && bun run build

# ── Stage 3: Production ─────────────────────────────────────────────
FROM oven/bun:1.3.5 AS runner
WORKDIR /app 

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Copy Next.js standalone output + static assets
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["bun", "apps/web/server.js"]
