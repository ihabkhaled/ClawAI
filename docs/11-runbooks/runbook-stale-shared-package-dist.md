# Runbook — a container runs a stale `@claw/shared-*` build

## When this applies

A service crash-loops, or a page 500s, on a symbol that plainly exists in the
source tree:

```
TypeError: Cannot read properties of undefined (reading 'BUG_REPORT')
  at module evaluation (src/constants/feedback.constants.ts:4:25)
```

```
error TS2339: Property 'CONNECTOR_MODEL_EXPOSURE_CHANGED' does not exist
  on type 'typeof EventPattern'.
```

Both were hit on 2026-08-26: `claw-frontend` returned 500 on `/admin/feedback`
and `claw-chat-service` sat `unhealthy` for hours, each failing on an enum its
own source declares.

The tell is that the symbol resolves in the editor, `npm run typecheck` passes on
the host, and only the container disagrees.

## Why it happens

Only `src` is bind-mounted into the dev containers. `packages/*/dist` is **baked
into the image at build time** and is not mounted, so a container started from an
older image carries an older build of every shared package. Source edits appear
instantly; a shared enum added after the image was built does not exist at all.

`@claw/shared-types` and `@claw/shared-constants` are re-exported through barrel
files, so a missing member surfaces as `undefined` at module evaluation rather
than as a resolution error — which is why the message names a property and not a
package.

## How to confirm

Compare the built artifact inside the container against the host:

```bash
grep -c FeedbackType packages/shared-types/dist/enums/index.js
docker exec claw-frontend sh -c "grep -c FeedbackType /app/packages/shared-types/dist/enums/index.js"
```

Host non-zero and container zero confirms it. Check the image age against the
commit that added the symbol:

```bash
docker inspect claw-frontend --format '{{.Created}}'
git log -1 --format=%cI -- packages/shared-types/src/enums
```

## Fix

**Correct fix — rebuild the image.** The dist is an image input, so the image is
what has to change:

```bash
./scripts/claw.sh down
docker rmi claw-frontend
./scripts/claw.sh up
```

**Unblocking a local session** — copy the built dist in and restart. This is a
container-local patch that a rebuild discards; it is for getting a test run
moving, never for a deployment:

```bash
docker cp packages/shared-types/dist claw-frontend:/app/packages/shared-types/
docker cp packages/shared-constants/dist claw-frontend:/app/packages/shared-constants/
docker restart claw-frontend
```

Build the dist on the host first if it is itself stale
(`npm run build --workspace=@claw/shared-types`).

Every service that imports the package needs the same treatment — chat-service
and frontend failed independently on the same root cause, and fixing one leaves
the other down.

## Prevention

Rebuild images after any commit that touches `packages/*/src`. A shared enum is
the highest-risk case, because the failure appears in a _consumer_ service and
reads like a bug in code nobody changed.

Related: [runbook-nginx-stale-config.md](runbook-nginx-stale-config.md) — the same
class of fault, where a container is pinned to an artifact the repository has
already moved past.
