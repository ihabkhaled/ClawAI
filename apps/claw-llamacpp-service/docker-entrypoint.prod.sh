#!/bin/sh
# llamacpp-service prod entrypoint.
#
# Why this exists separately from scripts/docker-entrypoint.prod.sh:
# Docker creates named volumes (e.g. llamacpp-data → /var/lib/claw/llamacpp)
# owned by root. The container runs as nestjs (uid 1001) and needs to write
# the auto-downloaded llama-server binary + model GGUFs into that volume.
# Without this script, the binary installer crashes with
#   EACCES: permission denied, mkdir '/var/lib/claw/llamacpp/bin'
# and pull jobs fail with the same error for /models.
#
# We start as root, chown the data volume to nestjs, then drop privileges
# via `runuser` (util-linux, pre-installed on bookworm-slim) and hand off
# to the generic Prisma-aware entrypoint.

set -e

DATA_PATH="${LLAMACPP_DATA_PATH:-/var/lib/claw/llamacpp}"

# Idempotent: existing dirs/ownership are not changed if already correct.
mkdir -p "$DATA_PATH/bin" "$DATA_PATH/models" "$DATA_PATH/tmp" "$DATA_PATH/cache"
chown -R nestjs:nestjs "$DATA_PATH"

echo "[llamacpp-entrypoint] data path ${DATA_PATH} ready (owner=nestjs:nestjs)"

exec runuser -u nestjs -- /app/docker-entrypoint.prod.sh
