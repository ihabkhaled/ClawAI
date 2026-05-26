#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Resolve the configured hostname so the printed URL matches whatever
# install.sh / .env was set to. Defaults to claw.local when unset.
resolve_hostname() {
  if [ -n "${CLAW_HOSTNAME:-}" ]; then echo "$CLAW_HOSTNAME"; return; fi
  if [ -f "$ROOT_DIR/.env" ]; then
    local h
    h="$(awk -F= '/^CLAW_HOSTNAME=/ {sub(/^[^=]*=/, "", $0); print; exit}' "$ROOT_DIR/.env")"
    if [ -n "$h" ]; then echo "$h"; return; fi
  fi
  echo "claw.local"
}
CLAW_HOSTNAME="$(resolve_hostname)"

echo ""
echo "  Setting up ClawAI..."
echo ""

# Copy .env.example to .env for all services (skip if .env already exists)
for dir in apps/claw-*/; do
  if [ -f "$dir.env.example" ] && [ ! -f "$dir.env" ]; then
    cp "$dir.env.example" "$dir.env"
    echo "  Created $dir.env from .env.example"
  elif [ -f "$dir.env" ]; then
    echo "  Skipped $dir.env (already exists)"
  fi
done

echo ""
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Review and update .env files in apps/claw-*/ if needed"
echo "    2. Run: ./scripts/claw.sh up"
echo "    3. Wait for all services to start (~60 seconds)"
echo "    4. Open https://${CLAW_HOSTNAME}"
echo "    5. Login with: admin@claw.local / ClawAdmin123!"
echo "    6. Change your password on first login"
echo ""
