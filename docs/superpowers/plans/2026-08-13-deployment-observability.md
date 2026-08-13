# Deployment Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make production deployment state visible in GitHub and ClawAI and send best-effort deployment emails through the existing SMTP configuration.

**Architecture:** Extend `deploy-prod.sh` with an atomic non-secret status document and make the existing workflow collect it into an always-written job summary. Mount that document read-only into auth-service, whose existing JWT/permission/super-admin and SMTP seams provide a protected read API and internal notification endpoint. The frontend reads that API through its established repository/query/controller/component layers.

**Tech Stack:** Bash, GitHub Actions, NestJS, Zod, existing shared Nodemailer utility, Next.js 16, TanStack Query, Vitest/Jest.

**Spec:** `docs/superpowers/specs/2026-08-13-deployment-observability-design.md`

## Global Constraints

- Preserve the successful-CI to release to exact-SHA production deployment chain.
- Never edit tracked files directly on `/srv/clawai` or expose secrets/logs in status, API, summary, or email.
- Reuse `INTER_SERVICE_AUTH_TOKEN` and `CONTACT_EMAIL_*`/`CONTACT_SMTP_*`; add no parallel token or mail stack.
- Deployment notification failure never changes the deployment result.
- Status API and navigation require both super-admin identity and `ADMIN_SYSTEM_VIEW`.
- Every frontend string is translated in all 13 locales and represented in `i18n.types.ts`.
- Each checkpoint runs scoped gates, commits normally, and pushes before the next checkpoint starts.

## Intake audit and deviations

- **Done:** CI/release/deploy wiring, exact SHA, production Environment, locking, clean-tree guard, bounded build retry, health verification, atomic `deployed-sha`, SMTP transport utility, admin permission guard.
- **Partial:** GitHub shows workflow state but no concise deployment summary; backend knows `isSuperAdmin` but login/profile payloads do not expose it to frontend; `.deploy/` is valid host state but not explicitly ignored.
- **Missing:** phase status JSON, summary collection, deployment email invocation, protected status endpoint, frontend status page.
- **SSH evidence applied:** a real v1.15.0 rollout spent about 19 minutes between lock acquisition and final marker while live containers were already healthy. Status therefore distinguishes running/finalizing from completed and refreshes its timestamp during per-service verification.
- **Deviation:** the approved draft placed the read endpoint in health-service. Repository ownership makes auth-service the smaller and safer seam because it already owns immutable super-admin checks, `ADMIN_SYSTEM_VIEW`, service-token authentication, and SMTP. No database boundary is crossed.
- **Excluded:** the report's `/auth/login` redirect defect and optional Ollama/llama.cpp health gap are independent incidents.

---

### Task 1: Atomic server status and GitHub summary

**Files:** `.gitignore`, `scripts/deploy-prod.sh`, `.github/workflows/deploy-production.yml`, focused tooling tests, and `docs/PRODUCTION_DEPLOYMENT.md`.

**Produces:** `.deploy/status.json` schema v1 and an always-written safe GitHub deployment summary.

- [ ] Add failing tests for atomic status replacement, safe failure trapping, phases, verification heartbeat, `.deploy/` ignore, workflow URL propagation, status collection, and `if: always()` summary.
- [ ] Run focused tests and confirm failures are caused by missing observability.
- [ ] Implement shell status helpers and phase calls without changing deployment ordering.
- [ ] Preserve the original exit code while recording a bounded failed state best-effort.
- [ ] Capture remote status after success/failure and write only safe fields to `$GITHUB_STEP_SUMMARY`.
- [ ] Update deployment documentation, run focused/syntax/generated gates, commit, and push.

### Task 2: Auth-owned status API and SMTP notifications

**Files:** shared deployment types/schema; a new auth deployment module; auth email/session/user services; dev/prod service compose; installers; deploy script; focused tests.

**Produces:** `GET /api/v1/admin/deployment`, `POST /api/v1/internal/deployment/notify`, and `isSuperAdmin` in auth summaries.

- [ ] Add failing shared-schema tests for valid, missing, malformed, unsafe URL/SHA, and stale-running status.
- [ ] Add failing auth tests for super-admin success, ordinary-admin/user rejection, safe unknown fallback, service-token protection, SMTP disabled/success/failure behavior, and identity propagation.
- [ ] Run focused tests and verify intended red failures.
- [ ] Implement the shared contract and thin auth adapter/service/controllers with extracted declarations.
- [ ] Export the existing email adapter and add a deployment-specific method using existing SMTP configuration.
- [ ] Bind-mount `.deploy` read-only into auth-service and ensure installers create it without overwriting state.
- [ ] Invoke notification inside the auth container after completed/failed writes; notification failure remains non-fatal.
- [ ] Run shared-types/auth gates and Compose validation, commit, and push.

### Task 3: Super-admin deployment page

**Files:** frontend user/deployment types and enums; routes/permissions/sidebar/query keys; deployment repository/hook/components/page; all locale dictionaries and `i18n.types.ts`; focused tests.

**Produces:** localized `/admin/deployment`, surfaced as `/en/admin/deployment` by middleware.

- [ ] Add failing tests for API mapping, polling termination, loading/error/unknown/running/stale/completed/failed rendering, safe links/SHA abbreviation, route permission, and super-admin-only navigation.
- [ ] Add `isSuperAdmin` to frontend session identity and gate navigation/page with identity plus permission.
- [ ] Implement types, enums, constants, repository, query key, hook, components, and pure-render page in repository order.
- [ ] Add real translations to `en/ar/de/es/fa/fr/hi/it/ja/pt/ru/th/zh` and update `i18n.types.ts` atomically.
- [ ] Run i18n audit and frontend typecheck/lint/test/build.
- [ ] Browser-verify primary states, mobile, dark theme, and Arabic RTL; write QA evidence; commit and push.

### Task 4: Completion and post-merge verification

- [ ] Update the PR description and wait for every GitHub gate.
- [ ] After merge, observe CI, release, and the production Environment deployment.
- [ ] Verify the GitHub summary and SMTP notification result.
- [ ] Through read-only SSH, verify clean tracked checkout, released lock, `HEAD == deployed-sha`, valid status JSON, and healthy selected containers.
