# ---- Base ----
FROM node:20-alpine AS base
# openssl is required by Prisma on Alpine
RUN apk add --no-cache libc6-compat openssl

# ---- Install dependencies ----
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
# Install all deps (including devDeps needed for tsx + build)
RUN npm ci --frozen-lockfile

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for the target platform
# DATABASE_URL must be set to satisfy prisma.config.ts at generate time
# (generate never connects to the DB; this is a build-only placeholder)
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN node_modules/.bin/prisma generate

# Build-time env: Next.js needs these to compile but real values come at runtime
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV NEXTAUTH_SECRET="build-time-placeholder-do-not-use"
ENV NEXTAUTH_URL="http://localhost:3000"

RUN npm run build

# ---- Runtime ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user and writable temp dir for tsx IPC sockets
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /app/tmp && chown nextjs:nodejs /app/tmp

ENV TMPDIR=/app/tmp

# Copy built artifacts (--chown sets ownership at copy time, no need for recursive chown)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Copy entrypoint
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start"]
