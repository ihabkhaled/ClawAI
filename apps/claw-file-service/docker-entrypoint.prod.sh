#!/bin/sh
# file-service prod entrypoint.
#
# Same root-cause as the llamacpp entrypoint: docker creates the
# `file-storage-data` named volume mounted at /data/files with root
# ownership, but the container runs as nestjs (uid 1001). Without this
# wrapper every upload crashed with
#   EACCES: permission denied, open '/data/files/<timestamp>-<uuid>.png'
#
# We start as root, fix ownership of the upload dir, then drop privileges
# via `runuser` (util-linux, the bookworm-native equivalent of alpine's
# su-exec) and hand off to the generic Prisma-aware entrypoint.

set -e

STORAGE_PATH="${FILE_STORAGE_PATH:-/data/files}"

mkdir -p "$STORAGE_PATH"
chown -R nestjs:nestjs "$STORAGE_PATH"

echo "[file-entrypoint] storage path ${STORAGE_PATH} ready (owner=nestjs:nestjs)"

exec runuser -u nestjs -- /app/docker-entrypoint.prod.sh
