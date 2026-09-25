# Runbook: production server overloaded or disk full from image builds

## Symptom

- The VPS (8 CPU, 16 GB RAM) is slow or unreachable over SSH; `top` shows CPU
  near 100% and RAM at 85–90%.
- clamd is OOM-killed (uploads fail with `ANTIVIRUS_UNAVAILABLE` —
  [runbook-clamav-unreachable.md](runbook-clamav-unreachable.md)).
- Or: the disk is full, and `docker system df` shows hundreds of GB under
  **Build Cache**.

## Why it happens

Production builds its own images inside `scripts/deploy-prod.sh`. Two causes,
both seen on 2026-09-25:

1. **Every release rebuilt every image.** A `chore(release)` commit rewrites
   `"version"` in ~25 manifests, and the root `package.json` counted as a
   broad-impact change, so each release rebuilt all ~20 images. `history.log`
   showed ~15 full rebuilds on 2026-09-24. Fixed by ADR-123: a manifest whose
   only differences are release versions is no longer a change. A release now
   rebuilds the frontend (its bundle inlines the version) plus whatever its
   feature commits touched.
2. **The build cache was pruned only after a healthy rollout.** Failed deploys
   never pruned; the cache reached 236 GB (220 GB reclaimable). The prune now
   runs before every build, after a healthy rollout, and from the exit trap
   after a failed one.

## Diagnose

```bash
cd /srv/clawai
top -o %MEM                                  # who holds CPU / RAM right now
docker stats --no-stream | sort -k4 -h       # per-container memory
docker system df                             # Build Cache size + RECLAIMABLE
df -h /var/lib/docker
tail -n 30 .deploy/history.log               # one line per deploy: time, SHA, services
cat .deploy/status.json                      # the rollout in flight, phase, services
ps -ef | grep -E 'buildkit|docker compose build' | grep -v grep
```

A `history.log` line listing ~20 services on a release commit means the full
rebuild is still happening: check that the deployer on the box includes the
release-version filter (`grep -n drop_version_only_changes scripts/deploy-prod.sh`)
and that `python3 --version` works. Without python3 the filter fails safe and
treats every manifest as a real change.

## Recover

1. If a deploy is building right now and the box is starving, let the build
   timeout (`CLAW_DEPLOY_BUILD_TIMEOUT`, 3600 s) or cancel the workflow run; the
   orphan guard aborts the remote build when the SSH session goes.
2. Free the cache (safe: removes only rebuildable BuildKit layers, never
   images, containers or volumes):

   ```bash
   docker builder prune --all --force --keep-storage 20GB
   ```

3. Restart clamd if it was OOM-killed: see
   [runbook-clamav-unreachable.md](runbook-clamav-unreachable.md).
4. Deploy once more if needed with a lower build concurrency:
   `COMPOSE_PARALLEL_LIMIT=1` (default 2, range 1–4).

Never run `docker system prune` or `docker volume prune` here — they can
delete database volumes.

## Prevent (operator, one-time host change)

Enable dockerd's own BuildKit garbage collection as a second bound that works
even when no deploy runs:

```json
// /etc/docker/daemon.json
{ "builder": { "gc": { "enabled": true, "defaultKeepStorage": "20GB" } } }
```

Then `sudo systemctl restart docker` (in a maintenance window: it restarts
every container). Wrapping the deploy in `nice`/`ionice` does not help: the
build runs inside dockerd/BuildKit, not in the compose client process.

## References

- [ADR-123](../13-adr/adr-123-release-version-bumps-are-not-deploy-changes.md)
- [PRODUCTION_DEPLOYMENT.md §2.2–§2.3](../PRODUCTION_DEPLOYMENT.md)
- `scripts/deploy-prod.sh` — `drop_version_only_changes`, `cleanup_build_cache`
