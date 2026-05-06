#!/bin/sh
set -e

echo "▶ Pushing database schema..."
node_modules/.bin/prisma db push --skip-generate

echo "▶ Seeding database (idempotent upserts)..."
node_modules/.bin/tsx prisma/seed.ts

echo "▶ Starting Next.js..."
exec "$@"
