#!/bin/bash
# =============================================================================
# ClawAI — Quick Setup (non-interactive)
# =============================================================================
# The fast path for getting a working .env on the project root without
# answering install.sh's prompts. Uses the placeholder secrets that ship in
# .env.example, so DB_PASSWORD ends up as "claw_secret" etc. — fine for local
# dev, NOT for an exposed server.
#
# For a real install with random secrets, mkcert TLS, and the admin prompt,
# use ./scripts/install.sh instead.
#
# What this script does (idempotent):
#   1. Copies .env.example → .env at the project root if .env is missing.
#   2. Reminds the user that ./scripts/install-tls.sh needs running for HTTPS.
#   3. Prints next-step commands.
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
CERTS_DIR="$ROOT_DIR/certs"

# Resolve the configured hostname so the printed URL matches whatever
# install.sh / .env was set to. Defaults to claw.local when unset.
resolve_hostname() {
  if [ -n "${CLAW_HOSTNAME:-}" ]; then echo "$CLAW_HOSTNAME"; return; fi
  if [ -f "$ENV_FILE" ]; then
    local h
    h="$(awk -F= '/^CLAW_HOSTNAME=/ {sub(/^[^=]*=/, "", $0); print; exit}' "$ENV_FILE")"
    if [ -n "$h" ]; then echo "$h"; return; fi
  fi
  echo "claw.local"
}
CLAW_HOSTNAME="$(resolve_hostname)"

echo ""
echo "  Setting up ClawAI..."
echo ""

# Root .env — the only env file docker compose actually reads.
if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f "$ENV_EXAMPLE" ]; then
    echo "  ERROR: $ENV_EXAMPLE not found. The repo is incomplete; run from a fresh clone." >&2
    exit 1
  fi
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "  Created $ENV_FILE from .env.example (placeholder secrets — fine for local dev)."
else
  echo "  Skipped .env (already exists)"
fi

# Per-app .env.example copies (legacy behaviour). Most services no longer ship
# their own .env.example because they read the root .env via docker compose,
# but if any per-app file IS present we still copy it for back-compat.
for dir in "$ROOT_DIR"/apps/claw-*/; do
  if [ -f "$dir.env.example" ] && [ ! -f "$dir.env" ]; then
    cp "$dir.env.example" "$dir.env"
    echo "  Created $dir.env from .env.example"
  fi
done

# TLS certs — present? If not, remind the user; do NOT generate them here so
# this script stays non-interactive. install-tls.sh handles the heavy lifting.
TLS_OK=0
if [ -f "$CERTS_DIR/claw.crt" ] && [ -f "$CERTS_DIR/claw.key" ] && [ -f "$CERTS_DIR/rootCA.pem" ]; then
  TLS_OK=1
fi

echo ""
echo "  Setup complete!"
echo ""
echo "  Next steps:"
if [ "$TLS_OK" -eq 0 ]; then
  echo "    1. Generate TLS certs:  ./scripts/install-tls.sh"
  echo "    2. Start the stack:     ./scripts/claw.sh up"
  echo "    3. Wait ~60 seconds for services to start"
  echo "    4. Open https://${CLAW_HOSTNAME}"
else
  echo "    1. Start the stack:     ./scripts/claw.sh up"
  echo "    2. Wait ~60 seconds for services to start"
  echo "    3. Open https://${CLAW_HOSTNAME}"
fi
echo "    Login with: admin@claw.local / ClawAdmin123!"
echo "    Change your password on first login."
echo ""
echo "  Note: setup.sh uses the placeholder credentials from .env.example."
echo "        For random secrets, mkcert-managed TLS, and a custom admin user,"
echo "        run ./scripts/install.sh instead."
echo ""
