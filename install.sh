#!/usr/bin/env bash
# One-click installer for KinetiRx.
#
# Run this from the repo root after cloning:
#   ./install.sh
#
# Generates deploy/.env with a random Postgres password and JWT secret
# (only if one doesn't already exist), builds the backend + frontend Docker
# images, starts the stack, and waits for it to come online. Leaves
# KINETIRX_ADMIN_PASSWORD unset on purpose — first visit shows a
# "Create Admin Account" screen instead of a pre-seeded login. Safe to
# re-run any time (e.g. after `git pull`, to rebuild) — nothing here
# overwrites an existing deploy/.env or touches existing data.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# --- 1. Check prerequisites -------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is not installed." >&2
  echo "Install it from https://docs.docker.com/get-docker/ and re-run this script." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: the 'docker compose' plugin was not found." >&2
  echo "Update Docker Desktop/Engine to a version that bundles Compose v2." >&2
  exit 1
fi

# --- 2. Generate deploy/.env if one doesn't exist already -------------------
# A one-click install can't ask you to hand-edit POSTGRES_PASSWORD and
# JWT_SECRET first — the compose file has no insecure default, it fails
# loudly instead — so generate real random values here.
if [ ! -f deploy/.env ]; then
  echo "No deploy/.env found — generating one with a random Postgres password and JWT secret..."
  if command -v openssl >/dev/null 2>&1; then
    pg_password="$(openssl rand -hex 16)"
    jwt_secret="$(openssl rand -hex 32)"
  else
    pg_password="$(head -c24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c32)"
    jwt_secret="$(head -c48 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c48)"
  fi
  cat > deploy/.env <<EOF
POSTGRES_USER=kinetirx
POSTGRES_PASSWORD=${pg_password}
POSTGRES_DB=kinetirx
JWT_SECRET=${jwt_secret}
KINETIRX_ADMIN_PASSWORD=
GEMINI_API_KEY=
GIN_MODE=release
HTTP_PORT=3080
BACKEND_PORT=8080
EOF
  echo "deploy/.env created."
fi

# --- 3. Build the images and start the stack --------------------------------
echo "Building KinetiRx images and starting the stack (this can take a few minutes on first run)..."
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build

# --- 4. Wait for the app to report healthy ----------------------------------
HTTP_PORT="$(grep -m1 '^HTTP_PORT=' deploy/.env 2>/dev/null | cut -d= -f2-)"
HTTP_PORT="${HTTP_PORT:-3080}"

echo "Waiting for the app to come online..."
ready=false
for _ in $(seq 1 90); do
  if curl -sf "http://localhost:${HTTP_PORT}/api/health" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [ "$ready" != "true" ]; then
  echo "Warning: the app didn't respond within 90s. Check the logs with:" >&2
  echo "  docker compose -f deploy/docker-compose.yml logs" >&2
  exit 1
fi

# --- 5. Done -----------------------------------------------------------------
echo ""
echo "KinetiRx is up and running."
echo "Open http://localhost:${HTTP_PORT} to create your admin account and set up your pharmacy."
