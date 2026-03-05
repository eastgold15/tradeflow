# ── Stage 1: Prune monorepo ──────────────────────────────────────────
FROM registry.cn-hangzhou.aliyuncs.com/oven/bun:1.3.5-slim AS pruner
WORKDIR /app
# Copy lockfile + package.jsons first, install turbo
COPY package.json bun.lock turbo.json ./
RUN bun install 

# Copy everything else, then prune
COPY . .
RUN bun run turbo prune b2b-admin --docker


# ── Stage 2: Install & Build ─────────────────────────────────────────
FROM registry.cn-hangzhou.aliyuncs.com/oven/bun:1.3.5-slim AS builder
WORKDIR /app

# Copy pruned lockfile + package.jsons (cache layer)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install 

# Then copy full source
COPY --from=pruner /app/out/full/ .

# Build Next.js (standalone mode)
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1
ARG DATABASE_URL
ARG DOMAIN
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV DATABASE_URL=$DATABASE_URL
ENV DOMAIN=$DOMAIN

RUN cd apps/b2b-admin && bun run build

# ── Stage 3: Production ─────────────────────────────────────────────
FROM registry.cn-hangzhou.aliyuncs.com/oven/bun:1.3.5-slim-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Copy Next.js standalone output + static assets
COPY --from=builder /app/apps/b2b-admin/.next/standalone ./
COPY --from=builder /app/apps/b2b-admin/.next/static ./apps/b2b-admin/.next/static

EXPOSE 3000

CMD ["bun", "apps/b2b-admin/server.js"]
