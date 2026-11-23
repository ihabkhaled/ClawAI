# Runbook - Local tests cannot start: Windows Smart App Control blocks a native binary

**Symptoms:** on the Windows dev PC, Vitest or the pre-push hook fails with
`ERR_DLOPEN_FAILED` and "An Application Control policy has blocked this file", naming a
`.node` file such as `@swc/core-win32-x64-msvc/swc.win32-x64-msvc.node` or
`argon2/prebuilds/win32-x64/argon2.glibc.node`. CI (Linux) is green for the same commit.

**Cause:** Smart App Control (`HKLM\SYSTEM\CurrentControlSet\Control\CI\Policy`,
`VerifiedAndReputablePolicyState=1`) refuses some genuine published binaries. It cannot allow
one file, and turning it off cannot be undone without reinstalling Windows, so it stays on. The
block comes and goes: swc and argon2 were blocked on 2026-09-29 and loaded again the same day.

**1. Check whether it is blocked right now** (from the repo root):

```sh
node -e "require('@swc/core'); console.log('swc ok')"
node -e "require('argon2'); console.log('argon2 ok')"
```

Both print `ok`: nothing is blocked; run tests and push normally. Stop here.

**2. Run the specs in Linux instead.** The specs do not need Windows; any Linux Node 24 with the
repo works. Use a throwaway container with the checkout mounted read-only and its own
`node_modules`, so the Windows binaries are never loaded:

```sh
MSYS_NO_PATHCONV=1 docker run --rm -v "$PWD":/src:ro -w /work node:24-bookworm sh -c \
  'cp -a /src/. /work && npm ci --ignore-scripts >/dev/null && \
   npm run build --workspace=@claw/shared-types --workspace=@claw/shared-constants \
     --workspace=@claw/shared-utilities >/dev/null && \
   cd apps/<service> && npx prisma generate >/dev/null 2>&1; npx vitest run <spec paths>'
```

The running dev containers are NOT a substitute: they hold a production-style install with no
Vitest (`ERR_MODULE_NOT_FOUND`, checked 2026-11-23).

**3. Push while it is blocked.** The owner authorized `git push --no-verify` for a pre-push
failure caused by this block only, and only when all of these hold:

1. The error text is the Application Control message above, not a real test failure.
2. The commit hooks ran and passed (they are never skipped).
3. Typecheck and lint for the touched workspaces were run by hand, and the specs ran in Linux
   (step 2) or the report says plainly that they did not.
4. GitHub CI is read after the push and its real result is reported.

Never use `--no-verify` for any other reason ([ADR-061](../13-adr/adr-061-git-hook-policy-no-bypass.md)).
