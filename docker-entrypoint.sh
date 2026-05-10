#!/bin/sh
set -e

echo "▶ Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "▶ Seeding database (idempotent upserts)..."
node_modules/.bin/tsx prisma/seed.ts

echo "▶ Starting Next.js..."
exec "$@"
