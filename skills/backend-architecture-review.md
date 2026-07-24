---
name: backend-architecture-review
summary: Review a NestJS backend change against ClawAI's controller/service/repository/manager boundaries, method-size ceilings, inline-extraction, no-any, and logging-coverage rules.
task_keywords:
  [
    backend review,
    controller,
    service,
    repository,
    manager,
    adapter,
    layering,
    method size,
    inline declaration,
    no-any,
    logging coverage,
    nestjs review,
    dto zod,
  ]
applies_to:
  [
    apps/claw-auth-service,
    apps/claw-chat-service,
    apps/claw-connector-service,
    apps/claw-routing-service,
    apps/claw-memory-service,
    apps/claw-file-service,
    apps/claw-audit-service,
    apps/claw-ollama-service,
    apps/claw-health-service,
    apps/claw-client-logs-service,
    apps/claw-server-logs-service,
    apps/claw-image-service,
    apps/claw-file-generation-service,
    apps/claw-agent-service,
    apps/claw-research-service,
    apps/claw-workspace-service,
    apps/claw-llamacpp-service,
    packages/shared-utilities,
  ]
required_rules: [02-backend-rules, 09-refactor-rules, 04-testing-rules]
required_context: [codebase-navigation, services-index, CODE_REVIEW_AND_PR_REVIEW_STANDARD]
affected_workspaces: [apps/claw-*, packages/shared-utilities]
required_tests: [review-only]
required_docs: [docs/04-backend/services-index, service-specific CLAUDE.md]
validation_lane: cd apps/claw-<service> && npm run typecheck && npm run lint && npm test && npm run build
---

**When to use**

- Reviewing any change under `apps/claw-<service>/src/` (controller, service, manager, repository, adapter, DTO, module).
- Auditing a service for layering violations, oversized methods, or inline declarations before approving a PR.

**When NOT to use**

- Frontend changes → use `./frontend-architecture-review.md`.
- Prisma/migration-only changes → use `./database-review.md`.
- Auth/RBAC/secrets focus → use `./security-review.md` and `./authorization-review.md`.

**Read first**

- `./resolve-task-context.md` — run the context resolver to pull the exact reviewer pack.
- `rules/02-backend-rules.md` (layer boundaries, ceilings, banned patterns), `rules/09-refactor-rules.md`.
- Service-specific `apps/claw-<service>/CLAUDE.md`.

**Repository discovery steps**

1. Identify the touched service(s): `git diff --name-only` scoped to `apps/claw-*/src`.
2. Map each changed file to its layer by suffix (`*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.manager.ts`, `*.adapter.ts`).
3. Read the surrounding module to confirm the Controller→Service→Repository/Manager chain is intact.

**Tests-first plan**

- Confirm every new/changed service method and DTO has a co-located `__tests__/*.spec.ts` (jest).
- Confirm error-path and boundary tests exist (manager catch branches, DTO fuzz). No `.skip`/`xit`.
- Confirm coverage did not drop below the 92% threshold.

**Implementation steps (review checklist)**

1. **Controller**: 3-line methods only (extract, ONE service call, return). NO try/catch, NO throw, NO business logic, NO repository access.
2. **Service**: ≤30 lines/method, complexity ≤10. Ownership/permission checks live HERE. Events published HERE (not controller/manager). No Prisma calls.
3. **Repository**: pure data access, NO throw (return data or null), one DB op/method, no raw SQL, no external calls, explicit return types.
4. **Manager**: ≤80 lines/method, complexity ≤15. Background paths call `emitError()` then `storeErrorMessage()` in nested try-catch.
5. **Adapter**: wraps vendor SDK; no raw SDK imports in services/controllers.
6. **Inline extraction**: no inline `type`/`interface`/`enum`/module-`const`/`function` in logic files — extracted to `types/`, `common/enums/`, `constants/`, `common/utilities/`, `dto/`. No string-literal unions (use enum).
7. **Banned patterns**: no `any`, no `as unknown as X`, no `==`/`!=`, no `var`, no `!` non-null, no `process.env` (use AppConfig), no `console.log`.
8. **File/method ceilings**: service file ≤300 (hard 500), manager/adapter ≤500, utility ≤300.
9. **Logging coverage**: every public method emits `logger.debug` on entry, `logger.error` in each catch, `logger.info` on side-effects, `logger.warn` on retry/fallback. Zero-log public method = blocker.
10. **DTO**: Zod schema in `dto/`, `.max()` on every string/array, both schema + inferred type exported.

**Security considerations**

- No secrets logged; encrypted fields stripped in repository mapping (defer detail to `./security-review.md`).
- Ownership check must be in the service, never controller/repository (IDOR — see `./authorization-review.md`).

**Failure modes**

- Controller with try/catch or a repository call → reject.
- Service method >30 lines hiding orchestration that belongs in a manager.
- Repository throwing instead of returning null.
- Inline enum/type in a `*.service.ts` slipping past because lint only warns.

**Validation commands**

- `rg -n "process\.env|console\.log|as unknown as|: any" apps/claw-<service>/src` — should be empty in logic files.
- `rg -n "try\s*\{|throw " apps/claw-<service>/src/**/*.controller.ts` — controllers must be clean.
- Gate lane: `cd apps/claw-<service> && npm run typecheck && npm run lint && npm test && npm run build`. NEVER `--no-verify`.

**Documentation updates**

- Confirm `docs/04-backend/services-index.md` and the service `CLAUDE.md` reflect any new endpoint/pattern.

**Definition of done**

- All 10 checklist items pass, tests green at ≥92% coverage, gate lane green, docs synced.
