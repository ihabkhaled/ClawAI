#!/bin/bash
set -e

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
echo "    2. Run: docker compose -f docker-compose.dev.yml up -d"
echo "    3. Wait for all services to start (~60 seconds)"
echo "    4. Open http://localhost:3000"
echo "    5. Login with: admin@claw.local / Admin123!"
echo "    6. Change your password on first login"
echo ""
