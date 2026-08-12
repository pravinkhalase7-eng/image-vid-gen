#!/bin/sh
set -eu

mkdir -p /data /app/storage

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:/data/prod.db"
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting StoryMotion on ${HOSTNAME:-0.0.0.0}:${PORT:-4000}"
exec npx next start -H "${HOSTNAME:-0.0.0.0}" -p "${PORT:-4000}"
