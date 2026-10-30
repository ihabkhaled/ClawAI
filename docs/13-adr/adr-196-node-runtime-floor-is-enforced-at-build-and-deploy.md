# ADR-196: The Node.js runtime floor is enforced at build and at deploy

**Status:** Accepted
**Date:** 2026-10-30

## Context

The Node.js security release of 2026-10-21 fixed CVE-2026-111497 (High): the bundled Brotli decoder
writes past an internal buffer when it decompresses malformed input with `node:zlib`, which can end
in remote code execution. It affects 22.x, 24.x and 26.x. Fixed in **22.23.4, 24.22.1 and 26.12.1**
(primary source: nodejs.org/en/blog/vulnerability/october-2026-security-releases, read 2026-10-30).
The same release fixes two High TLS hostname bypasses and a keep-alive response bug.

What the repository did before this change (audited 2026-10-30):

- 44 first-party Dockerfiles, 65 `FROM node:` stages, all on the mutable tags `node:26-bookworm-slim`
  or `node:26-alpine`. A tag is not proof of a version.
- Root `engines` admitted `^22.22.2 || ^24.15.0 || >=26.0.0`, all vulnerable.
- `deploy-prod.sh` ran `docker compose build` without `--pull`, and it rebuilds only the services a
  commit touches, so an untouched service keeps whatever base layer it was built on.
- Live evidence, local stack: 21 containers on Node 26.7.0, one on 26.10.0 (frontend), two third-party
  Firecrawl images on 22.23.2 and 22.23.3. All are below the fixed versions.

## Decision

1. One source of truth, `tools/security/node-runtime-floor.mjs`, holds the per-line floors.
2. Every `FROM node:` stage in every Dockerfile is followed by one guard `RUN` that exits 1 when the
   base image is below its floor. A stale cached base now fails the build instead of shipping.
   `--sync` rewrites the guards from the source of truth and keeps each file's line endings.
3. `deploy-prod.sh` builds with `--pull`, so each build asks the registry for the current base image.
4. Root `engines` is generated from the same floors (a test compares them).
5. A test discovers every tracked Dockerfile from git, so a new service cannot skip the guard.
6. `node tools/security/node-runtime-floor.mjs --running` is the read-only check of what actually runs.

Changing a floor edits the module, the Dockerfiles (via `--sync`) and `package.json`. `package.json`
and the Dockerfiles are broad-impact files, so the next deploy rebuilds the whole fleet by itself.

## Consequences

- The next production release rebuilds all services once. That is intended, it is the full-fleet
  refresh the advisory needs.
- A build now fails while the registry still serves a vulnerable tag. That is correct behaviour.
- Third-party images (Firecrawl API and Playwright) are not ours to patch. They are reported by
  `--running` and tracked in the runbook until upstream ships a fixed Node.
- Not done, by design: digest pinning (needs an owner decision on refresh cadence), SBOM and scanner
  in CI, and runtime attestation inside the deploy script. They are in the program plan.
- `.nvmrc` stays `24` (CI takes the newest 24.x). The coding-agent extension keeps `>=22.13.0`
  because it runs on the editor's Node, not ours.
- A running container is only fixed after it is recreated from a rebuilt image. The guard does not
  change running containers.

See [runbook-node-runtime-floor](../11-runbooks/runbook-node-runtime-floor.md) and
[the three-workstreams plan](../03-architecture/three-workstreams-plan-2026-10-30.md).
