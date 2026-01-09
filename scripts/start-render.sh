#!/usr/bin/env bash
set -euo pipefail

echo "[start-render] Running prisma migrate deploy..."
bunx prisma migrate deploy

echo "[start-render] Running prisma db seed (idempotent)..."
bunx prisma db seed

echo "[start-render] Starting server..."
node dist/src/server.js

