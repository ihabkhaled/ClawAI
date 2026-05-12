#!/bin/sh
set -e
echo "Rebuilding shared packages (bind-mounted source may be ahead of image-built dist)..."
for pkg in shared-types shared-constants shared-rabbitmq shared-auth shared-utilities; do
  if [ -d "/app/packages/$pkg" ]; then
    echo "  → $pkg"
    (cd "/app/packages/$pkg" && npx tsc 2>&1) || echo "  ! $pkg build failed (continuing)"
  fi
done
echo "Starting dev server (nest start --watch)..."
exec npm run dev
