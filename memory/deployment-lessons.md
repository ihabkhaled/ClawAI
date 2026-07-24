# Deployment Lessons

Durable lessons about building, shipping, and running the stack (split Docker compose,
`claw.sh`, tsgo toolchain, GPU overlays, hot reload, TLS). See [README](README.md).

---

### A new service is 18 edits, not one — the checklist exists because pieces get missed (2026-07-24)

**What happened.** Adding a service touched far more than its own folder: all split
compose files, nginx, health aggregator, shared-constants port/name, shared-types
events, `.env`/`.env.example`, both installers, CI, i18n, docs, TLS SAN list. Missing
any one produced a runtime failure ("container not found", TLS mismatch, missing port
constant) far from the omission.

**The durable lesson.** In a wired system, a component is defined by its wiring as much
as its code. A half-wired service compiles and then fails in production at the exact
seam you forgot.

**How to apply.** Follow the 18-item infra checklist for every new service/port/
volume/DB. Add DBs to both `*.databases.yml` files, services to both `*.services.yml`
files, in the same commit. Never add a DB to only one compose file.

**Related.** `CLAUDE.md` → MANDATORY Change Checklist / How to Add a New Backend Service.

---

### Only `affected` folders get gated — an all-workspace run is the wrong default (2026-07-24)

**What happened.** Running lint/typecheck/test/build across all 17 services + frontend

- 6 packages for a one-file change costs many CPU-minutes and _false-fails_ in a fresh
  worktree where sibling Prisma clients aren't generated.

**The durable lesson.** Validation scope should equal change scope. An all-workspace
gate on a scoped change is both prohibitively expensive and prone to false negatives
from unbuilt siblings — it punishes correct work.

**How to apply.** Run the four gates only inside each touched folder. Multi-folder
change → gate each touched folder, never the untouched ones. Non-workspace files
(scripts, infra) → cheapest equivalent check (`node --check`, JSON validate). Full
`npm run release:preflight` only at release. See ADR-060.

**Related.** ADR-060 affected-workspace-validation;
[testing/quality-gates](../testing/quality-gates.md).

---

### Rebuild the container fully when shared packages change; restart for source (2026-07-24)

**What happened.** Just restarting (or `--build` alone) after a shared-package change
left stale compiled code, cached layers, and old `node_modules`.

**The durable lesson.** Hot reload covers source under `node --watch`; it does NOT
propagate a rebuilt shared package or a dependency/schema change. Assuming it does
ships stale bytes that look like a mystery bug.

**How to apply.** Source (`src/`) → auto-detected, no restart. Shared package changed →
full stop → rm → rmi → build for every dependent service. Prisma schema / deps →
rebuild. `.env` → restart. Nginx config → restart nginx.

**Related.** `CLAUDE.md` → Docker Container Rebuild Procedure / Hot Reload Matrix.

---

### Determinism across dev/CI/containers requires pinning ambient inputs (2026-07-24)

**What happened.** Locale-sensitive APIs (`localeCompare`) and other host-dependent
behavior produced different results in containers than on dev machines.

**The durable lesson.** Anything that reads ambient host state (locale, timezone,
default charset) is an undeclared environment dependency that will differ somewhere in
the pipeline.

**How to apply.** Pin locale/timezone explicitly where behavior depends on them; use
locale-independent comparison for machine ordering. Base images are glibc
(`node:26-bookworm-slim`), not Alpine, because tsgo and llama.cpp release binaries are
not musl-compatible — don't "optimize" to Alpine.

**Related.** [known-pitfalls](known-pitfalls.md) (localeCompare); `CLAUDE.md` → build toolchain.
