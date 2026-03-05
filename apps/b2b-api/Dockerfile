# ── Stage 1: Prune monorepo ──────────────────────────────────────────
FROM oven/bun:1.3.5 AS pruner
WORKDIR /app

# Copy lockfile + package.jsons first, install turbo
COPY package.json bun.lock turbo.json ./
RUN bun install 

# Copy everything else, then prune
COPY . .
RUN bun run turbo prune b2b-api --docker

# ── Stage 2: Install dependencies ────────────────────────────────────
FROM oven/bun:1.3.5 AS installer
WORKDIR /app


# Copy pruned lockfile + package.jsons (cache layer)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install 

# Then copy full source
COPY --from=pruner /app/out/full/ .

# Build the compiled binary
RUN cd apps/b2b-api && bun run build

# ── Stage 3: Production (minimal) ───────────────────────────────────
FROM debian:bookworm-slim AS runner
WORKDIR /app

# Install minimal runtime deps (for compiled bun binary)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy only the compiled binary
COPY --from=installer /app/apps/b2b-api/dist/server ./server

ENV NODE_ENV=production
EXPOSE 9012

CMD ["./server"]
