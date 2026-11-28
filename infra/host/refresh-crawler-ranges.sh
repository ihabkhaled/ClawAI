#!/usr/bin/env bash
# =============================================================================
# Refresh the verified-crawler IP ranges nginx reads (ADR-232)
# =============================================================================
# Run by claw-crawler-ranges.timer as root, every night. It downloads the crawlers' OWN published range files
# (tools/crawlers/update-verified-crawler-ranges.mjs), and only when something changed it proves the result with
# `nginx -t` inside the running container, reloads nginx, and checks that nginx really sees the new file.
#
# Why not edit the repository copy: the production deploy refuses a dirty git tree, and a refreshed
# infra/nginx/verified-crawlers/ranges.conf would be exactly that. The live copy lives in
# NGINX_CRAWLER_RANGES_DIR (.env), a host directory OUTSIDE the checkout, which compose mounts into nginx as a
# DIRECTORY (a single-file bind mount would keep serving the old inode: runbook-nginx-stale-config).
#
# Safety net, in this order: the updater refuses a file that is empty, shrank by more than half, or has a
# malformed / too-broad / private range (it keeps the previous copy of a broken source); this script keeps the
# previous file as ranges.conf.prev and puts it back if `nginx -t` fails.
#
# Exit codes: 0 refreshed or unchanged · 3 refreshed, but a source is stale (see the file header and the log) ·
#             1 refused or failed, nothing changed · 2 not set up (NGINX_CRAWLER_RANGES_DIR).
# Usage: sudo bash infra/host/refresh-crawler-ranges.sh [--dry-run]
# =============================================================================
set -euo pipefail

ROOT="${CLAW_ROOT:-/srv/clawai}"
ENV_FILE="${CLAW_ENV_FILE:-$ROOT/.env}"
NGINX_CONTAINER="${NGINX_CONTAINER:-claw-nginx}"
NODE_IMAGE="${CRAWLER_UPDATER_NODE_IMAGE:-node:24-alpine}"
RUNNER="${CRAWLER_UPDATER_RUNNER:-auto}" # auto: host Node 20+ when present, else a throwaway container; or node | docker
MOUNT_TARGET="/etc/nginx/claw/verified-crawlers"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERROR: $*" >&2; exit "${2:-1}"; }

env_value() { # the raw value of KEY in the .env file, empty when absent
  [ -f "$ENV_FILE" ] || return 0
  awk -v k="$1" 'index($0, k "=") == 1 { v = substr($0, length(k) + 2); sub(/\r$/, "", v); print v; exit }' "$ENV_FILE"
}

DIR="${NGINX_CRAWLER_RANGES_DIR:-$(env_value NGINX_CRAWLER_RANGES_DIR)}"
[ -n "$DIR" ] || die "NGINX_CRAWLER_RANGES_DIR is not set in $ENV_FILE. Set it (runbook-production-host-hardening, section 7), recreate nginx once, then run this again." 2
case "$DIR" in /*) ;; *) die "NGINX_CRAWLER_RANGES_DIR must be an absolute path, got '$DIR'" 2 ;; esac
case "$(realpath -m "$DIR")/" in
  "$(realpath -m "$ROOT")"/*) die "NGINX_CRAWLER_RANGES_DIR ($DIR) is inside the git checkout ($ROOT): a refresh would dirty the tree the deploy checks. Use a directory outside it, for example /var/lib/claw/verified-crawlers." 2 ;;
esac

FILE="$DIR/ranges.conf"
BASELINE="$ROOT/infra/nginx/verified-crawlers/ranges.conf"
install -d -m 0755 "$DIR"
if [ ! -f "$FILE" ]; then
  [ -f "$BASELINE" ] || die "no $FILE and no baseline $BASELINE to seed it from"
  cp "$BASELINE" "$FILE"
  log "seeded $FILE from the committed baseline"
fi
cp -p "$FILE" "$FILE.prev"

UPDATER_ARGS=(--out)
STATUS=0
if [ "$RUNNER" = node ] || { [ "$RUNNER" = auto ] && command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }; then
  [ "$DRY_RUN" -eq 1 ] && UPDATER_ARGS+=("$FILE" --dry-run) || UPDATER_ARGS+=("$FILE")
  node "$ROOT/tools/crawlers/update-verified-crawler-ranges.mjs" "${UPDATER_ARGS[@]}" || STATUS=$?
else
  # The host has no Node: run the dependency-free updater in a throwaway container.
  [ "$DRY_RUN" -eq 1 ] && UPDATER_ARGS+=(/out/ranges.conf --dry-run) || UPDATER_ARGS+=(/out/ranges.conf)
  docker run --rm -v "$ROOT/tools/crawlers:/app:ro" -v "$DIR:/out" -w /app "$NODE_IMAGE" \
    node /app/update-verified-crawler-ranges.mjs "${UPDATER_ARGS[@]}" || STATUS=$?
fi
[ "$STATUS" -eq 0 ] || [ "$STATUS" -eq 3 ] || { log "the updater refused (exit $STATUS); the previous ranges stay in place"; exit 1; }
[ "$DRY_RUN" -eq 0 ] || { log "dry run: nothing written"; exit "$STATUS"; }

if cmp -s "$FILE" "$FILE.prev"; then
  log "ranges unchanged; nginx left alone"
  exit "$STATUS"
fi

log "ranges changed; checking them with nginx -t"
if ! docker exec "$NGINX_CONTAINER" nginx -t >/dev/null 2>&1; then
  mv -f "$FILE.prev" "$FILE"
  die "nginx -t rejected the new ranges; the previous file was put back"
fi
docker exec "$NGINX_CONTAINER" nginx -s reload || { mv -f "$FILE.prev" "$FILE"; die "nginx reload failed; the previous file was put back"; }

# A directory mount shows the new file at once. A container created BEFORE NGINX_CRAWLER_RANGES_DIR was set
# still mounts the repository directory and would silently keep the old ranges.
HOST_SUM="$(sha256sum "$FILE" | awk '{print $1}')"
SEEN_SUM="$(docker exec "$NGINX_CONTAINER" sha256sum "$MOUNT_TARGET/ranges.conf" 2>/dev/null | awk '{print $1}')"
if [ "$HOST_SUM" != "$SEEN_SUM" ]; then
  die "nginx does not see $FILE: its container mounts a different directory. Recreate it: docker compose ... up -d --no-deps --force-recreate nginx"
fi
log "ranges refreshed and nginx reloaded ($(grep -c ';$' "$FILE") prefixes)"
exit "$STATUS"
