# ClawAI — Current-State Audit (AI-Native Engineering OS, Slice 1)

**Date:** 2026-07-24
**Method:** Facts derived by a deterministic extractor (`tools/audit/`) reading
real repository files. Machine-readable baseline: `inventory.snapshot.json` in
this folder (re-run with `npm run audit`). Every number below is traceable to a
canonical source; anything inferred by heuristic is tagged `unverified` in the
JSON and called out here.

> This is not a hand-counted report. `npm run audit:check` fails CI if the
> committed snapshot drifts from source, so these facts cannot silently rot.

---

## 1. Baseline inventory (verified)

| Dimension                           | Count | Canonical source                                     |
| ----------------------------------- | ----: | ---------------------------------------------------- |
| Workspaces                          |    24 | root `package.json` workspaces                       |
| — NestJS services                   |    17 | `@nestjs/core` in each `package.json`                |
| — Shared packages                   |     6 | `packages/*`                                         |
| — Frontend                          |     1 | `apps/claw-frontend`                                 |
| Service port constants              |    15 | `packages/shared-constants/src/index.ts`             |
| API endpoints                       |   493 | `@Controller`/`@Get`/`@Post`/… decorators            |
| RabbitMQ event patterns             |   147 | `packages/shared-types/src/events/event-patterns.ts` |
| Permissions                         |    38 | `packages/shared-types/src/enums/permission.enum.ts` |
| Environment variables               |   274 | `.env.example`                                       |
| Nginx location→backend routes       |    46 | `infra/nginx/nginx.conf`                             |
| Docker compose services (incl. DBs) |    39 | `docker/docker-compose.*.yml`                        |
| Frontend pages                      |    89 | `apps/claw-frontend/src/app/**/page.tsx`             |
| i18n locales                        |     9 | `apps/claw-frontend/src/lib/i18n/locales`            |
| Test files                          |   507 | `*.spec.ts` / `*.test.ts`                            |
| Doc categories                      |    22 | `docs/`                                              |

The full per-service catalog (ports, DB, models, endpoints, internal deps,
produced/consumed events) is generated at `.ai/manifests/services.json` and
narrated in [`context/service-catalog.md`](../../../context/service-catalog.md).

---

## 2. What already exists and should be retained

- **A mature codebase**: 17 services + frontend + 6 shared packages, 507 test
  files, a real event bus (`claw.events`), Prisma + Mongoose ownership per
  service, an nginx route map, split docker compose files, TLS, Vercel deploy.
- **Governance seeds**: `rules/` (10 files), `skills/` (10 files), a large
  `docs/` tree (22 categories), and heavyweight AI instruction files
  (`CLAUDE.md`, `CODEX.md`, `cursor.md`).
- **Strong conventions already written down** in `CLAUDE.md`: layering,
  extraction rules, the 18-item infra checklist, the SSE/error-handling lessons.

These are the foundation the AI-native OS **extends** — not replaces.

---

## 3. Contradictions & cross-source disagreements

Computed by `tools/lib/analyzers.mjs`, not by reading prose.

- **Port ↔ nginx: 0 disagreements.** Every nginx `set $x_backend` port matches
  the `*_SERVICE_PORT` constant. Good.
- **Service-count / locale-count claims: 0 stale** at audit time (the docs'
  "17 microservices" and "9 locales" match the derived counts). The analyzer
  stays wired so future drift fails the gate.

---

## 4. Gaps (missing or incomplete)

1. **Two services have no port constant.** `claw-client-logs-service` (4010) and
   `claw-server-logs-service` (4011) are absent from
   `packages/shared-constants/src/index.ts` — their ports live only in `.env`.
   15 constants for 17 services. This is a real discoverability gap for humans
   and agents: the canonical port catalog is incomplete.
   → Tracked finding `service-without-port-constant` in the snapshot.
2. **No task-scoped context system** existed before this slice — every agent had
   to load the 153 KB `CLAUDE.md` for a one-line change.
3. **No machine-readable architecture manifests** — architecture lived only in
   prose, so nothing could verify a doc claim against source. (Addressed:
   `.ai/manifests/`.)
4. **No affected-workspace engine** — the only gate paths were all-24-workspace,
   which is expensive and false-fails in fresh worktrees. (Addressed:
   `tools/affected/`.)

---

## 5. Duplication

The three AI instruction files are large and heavily mirrored:

| File        |   Size | Shared headings                             |
| ----------- | -----: | ------------------------------------------- |
| `CLAUDE.md` | 153 KB | —                                           |
| `CODEX.md`  | 119 KB | **170 identical headings with `CLAUDE.md`** |
| `cursor.md` |  19 KB | 3–4 with each                               |

`CLAUDE.md` and `CODEX.md` share **170 identical section headings** — they are
near-mirrors. This is the "giant duplicated AI instruction files" problem the
initiative targets. **Direction:** `CLAUDE.md` stays canonical long-form policy;
`CODEX.md`/`cursor.md`/new per-model files become **compact routers** that point
to canonical sources instead of copying them. (Executed in the entrypoints
slice; `knowledge:verify` will flag any router that re-copies canonical bodies.)

---

## 6. Documented-but-unenforced rules

Many strong rules in `CLAUDE.md` had **no mechanical enforcement** — they relied
on an agent remembering to follow them:

- "No inline types/enums/consts in logic files" — partially enforced by
  `eslint.config.mjs` `no-restricted-syntax`, but the config is a single 17 KB
  monolith with no architecture-layer rules (no cross-layer import bans, no
  controller-no-logic rule, no repository-persistence-only rule).
- "Per-folder gates, never all-workspace" — documented, but the root scripts
  (`npm run lint/typecheck/test/build`) still fan out to all workspaces; there
  was no `affected:*` lane. (Addressed.)
- "Never bypass hooks" — **contradicted by the docs themselves** (see §7).
- Coverage "≥92%" — declared in prose; per-workspace `coverageThreshold`
  enforcement is uneven (captured per workspace in the snapshot's
  `coverageThresholds`, tagged `unverified` because declared ≠ executed).

---

## 7. Governance contradiction: hook bypass

The scanner found **`--no-verify` recommended in 3 canonical files** (18 total
mentions: CLAUDE.md ×7, CODEX.md ×7, cursor.md ×4). This directly contradicts
the "never bypass hooks" principle. `npm run knowledge:verify` **fails** until
these are removed — the remediation is verifiable, not aspirational. The correct
model is scoped, affected-aware hooks that are fast enough not to invite bypass.

---

## 8. Manually-maintained but should be generated

- Per-service facts scattered across README/CLAUDE/docker/nginx → now generated
  into `.ai/manifests/*.json`.
- Per-workspace agent guidance → now generated into 24 `AGENTS.md` files.
- The compact agent entrypoint → generated `.ai/BOOTSTRAP.md`.
- Task packs → generated from the classifier's single source of truth.

---

## 9. Command ↔ CI drift

Root scripts run all-workspace lint/typecheck/test/build; CI generated 13 Prisma
clients and ran the full matrix. A one-file change paid the whole-repo cost. The
new `affected:*` lane + `release:preflight` give a cheap PR path and a complete
release path that both call the **same authoritative scripts** — no CI-only
commands.

---

## 10. What this slice delivered (and what remains)

**Delivered (working, tested, deterministic):**

- `tools/audit/` — this report's fact base (`npm run audit`, `audit:check`).
- `tools/knowledge/` — `.ai/manifests/` (19), `.ai/BOOTSTRAP.md`, `.ai/packs/`,
  24 generated workspace `AGENTS.md`, the deterministic context resolver
  (`knowledge:context`), and `knowledge:verify`/`knowledge:check`.
- `tools/affected/` — dependency-aware impact + gate lanes.
- `tools/release/preflight.mjs` — full release gate.
- 19 tooling tests (`node --test`), all passing; byte-identical determinism
  verified (locale-independent sorting throughout).

**Remaining (tracked, later slices):** the long tail of `.ai` manifests/graphs,
optional semantic retrieval, the full split-ESLint custom-rule plugin test
matrix, repo-wide coverage ratcheting to the ≥95% target, and the visual/load
test suites. These require the running stack or are multi-slice; they are named
here rather than pretended done.

> **Note — `apps/claw-frontend/AGENTS.md` deferred from this commit.** When this
> slice landed, the frontend workspace had unrelated in-flight work (a separate
> SEO/marketing feature) in the working tree that did not typecheck. To keep this
> governance commit's gates honestly green without entangling or bypassing that
> work, the generated `apps/claw-frontend/AGENTS.md` and the one-line
> `apps/claw-frontend/.lintstagedrc.cjs` exclusion for it were left out of this
> commit (the file is still generated on demand by `npm run knowledge:build`).
> The other 23 workspace `AGENTS.md` files are committed. Land the frontend pair
> once that in-flight work is committed and the workspace typechecks again.

---

_Regenerate this report's data: `npm run audit`. The prose here is authored;
the numbers are derived. If a number here disagrees with the snapshot, the
snapshot wins._
