# Runbook: Node.js runtime below the security floor

**When:** a Node.js security release lands, a build fails with `is below the CVE-2026-111497 floor`,
or you must prove what Node version production actually runs. Decision: [ADR-196](../13-adr/adr-196-node-runtime-floor-is-enforced-at-build-and-deploy.md).

## 1. What runs now (read-only)

```bash
node tools/security/node-runtime-floor.mjs --running      # every claw-* container, exit 1 if any is below the floor
docker exec claw-chat-service-1 node -p process.version   # one container
docker image inspect node:26-bookworm-slim --format '{{.Created}} {{index .RepoDigests 0}}'
```

On production run the same commands on the host that owns `/srv/clawai`. Production state is
**unverified** until you do; the repository cannot prove it.

## 2. A build fails on the guard

The registry copy or the local cache of the base image is older than the fix.

```bash
docker pull node:26-bookworm-slim && docker pull node:26-alpine
docker compose -f docker/docker-compose.prod.services.yml build --pull <service>
```

`deploy-prod.sh` already passes `--pull`. If the pull still returns a vulnerable version, the
registry has not published the fixed tag yet: wait, do not lower the floor.

## 3. Raise the floor after a new Node security release

1. Confirm the new fixed versions on nodejs.org (the release notes, not a third-party summary).
2. Edit `FLOORS` in `tools/security/node-runtime-floor.mjs`.
3. `node tools/security/node-runtime-floor.mjs --sync` (rewrites every Dockerfile guard).
4. Copy the printed `engines` range into root `package.json` and the root entry of `package-lock.json`.
5. Commit. The next deploy rebuilds every service, then recreate and run step 1.

## 4. Third-party images

`claw-firecrawl-api` and `claw-firecrawl-playwright` ship their own Node. On 2026-10-30 they ran
22.23.3 and 22.23.2 (fixed: 22.23.4). Pull a newer upstream tag and recreate them. Until then the
exposure is limited to what those services decompress with Brotli. Whether they are reachable from
outside was not checked.

## 5. A recreated container must not lose work

Recreating chat-service interrupts live streams. Do it at low traffic; the stream bus replays from
Redis on reconnect (see the three-workstreams plan for the limits of that replay).
