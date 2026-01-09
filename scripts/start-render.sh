#!/usr/bin/env bash
set -euo pipefail

if [[ "${RUN_SEED_ON_START:-0}" == "1" ]]; then
  echo "[start-render] RUN_SEED_ON_START=1 -> running seed (idempotent)..."
  node dist/src/seed.js
else
  echo "[start-render] RUN_SEED_ON_START!=1 -> skipping seed"
fi

echo "[start-render] Starting server..."
node dist/src/server.js

