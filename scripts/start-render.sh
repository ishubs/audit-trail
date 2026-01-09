#!/usr/bin/env bash
set -euo pipefail

echo "[start-render] Running prisma migrate deploy..."
bun x prisma migrate deploy

echo "[start-render] Running seed (idempotent)..."
# Run compiled seed to avoid requiring tsx in production.
node dist/prisma/seed.js

echo "[start-render] Starting server..."
node dist/src/server.js

