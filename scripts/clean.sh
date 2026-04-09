#!/bin/bash
# =============================================================================
# clean.sh — Remove all node_modules/ and dist/ across the monorepo
# Usage: bash scripts/clean.sh
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "🧹 Cleaning ClawAI monorepo: $ROOT_DIR"
echo ""

DIRS_REMOVED=0
SPACE_FREED=0

remove_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    local size
    size=$(du -sm "$dir" 2>/dev/null | cut -f1)
    local relative="${dir#$ROOT_DIR/}"
    echo "  ✕ $relative (${size}MB)"
    rm -rf "$dir"
    DIRS_REMOVED=$((DIRS_REMOVED + 1))
    SPACE_FREED=$((SPACE_FREED + size))
  fi
}

# Root
echo "Root:"
remove_dir "$ROOT_DIR/node_modules"
remove_dir "$ROOT_DIR/dist"

# Packages
echo ""
echo "Packages:"
for pkg in "$ROOT_DIR"/packages/*/; do
  [ -d "$pkg" ] || continue
  remove_dir "${pkg}node_modules"
  remove_dir "${pkg}dist"
done

# Apps
echo ""
echo "Apps:"
for app in "$ROOT_DIR"/apps/*/; do
  [ -d "$app" ] || continue
  remove_dir "${app}node_modules"
  remove_dir "${app}dist"
done

echo ""
echo "✅ Done. Removed $DIRS_REMOVED directories, freed ~${SPACE_FREED}MB"
echo ""
echo "To reinstall: npm install"
