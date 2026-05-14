#!/bin/sh
set -e

# Run migrations only if SKIP_MIGRATE is not set.
# In Cloud Run (production), run migrations as a separate Job before deploying.
# Set SKIP_MIGRATE=1 to bypass (e.g. during smoke testing or initial deploy).
if [ "${SKIP_MIGRATE}" != "1" ]; then
  echo "▶ Applying database migrations..."
  DATABASE_URL="$DATABASE_URL" node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma
fi

echo "▶ Starting Next.js..."
exec "$@"
