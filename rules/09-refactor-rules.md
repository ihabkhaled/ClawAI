# ClawAI — Refactor Rules (Mandatory)

> Refactoring is not "tidying when you have time" — it is a hard discipline with the same delivery gates as feature work. This file defines exactly what counts as a clean refactor, what is banned, and what every per-service refactor commit must contain. Codified 2026-04-26 from the lessons of the codebase-wide refactor (`.claude/Integrations/refactor__PLAN.md`).

---

## R1 — Extraction Discipline (zero inline declarations in logic files)

A "logic file" is any of: `*.service.ts`, `*.manager.ts`, `*.controller.ts`, `*.repository.ts`, `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`, `*.pipe.ts`, `*.module.ts`, `*.interceptor.ts`.

In a logic file, the following are BANNED (enforced by ESLint `no-restricted-syntax`):

| Banned in logic files          | Move to                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------- |
| inline `interface X { ... }`   | `src/modules/<domain>/types/<name>.types.ts` or `src/common/types/`             |
| inline `type X = { ... }`      | `src/modules/<domain>/types/<name>.types.ts` or `src/common/types/`             |
| inline `enum X { ... }`        | `src/common/enums/<name>.enum.ts`                                               |
| top-level `const X = ...`      | `src/common/constants/<name>.constants.ts` or `src/modules/<domain>/constants/` |
| `function name() { ... }`      | `src/common/utilities/<name>.utility.ts`                                        |
| string-literal-union types     | enum in `src/common/enums/`                                                     |
| `as unknown as X` (hidden any) | real types or refactor                                                          |
| `console.log/debug/info/trace` | NestJS `Logger`                                                                 |
| `let` at module scope          | `const` or move state into a class                                              |

Only exception: `private readonly logger = new Logger(MyClass.name)` inside NestJS classes.

Index files (`src/types/index.ts`, `src/enums/index.ts`, `src/constants/index.ts`, `src/utilities/index.ts`) re-export everything for ergonomic imports.

## R2 — Method-Size Discipline

| Layer                    |        Max lines        | Max complexity |
| ------------------------ | :---------------------: | :------------: |
| `*.service.ts` method    |           50            |       10       |
| `*.manager.ts` method    |           80            |       15       |
| `*.controller.ts` method | 3 (extract+call+return) |      n/a       |
| `*.utility.ts` function  |           30            |       10       |
| `*.repository.ts` method |           30            |       10       |

A method exceeding its ceiling MUST be split. Acceptable extraction targets:

- Validation logic → private helper
- Transformation logic → private helper or utility
- External-call orchestration → manager helper
- Pure computation → utility file (cross-service if reusable)

If the same helper is needed in 2+ services, it goes to `packages/shared-utilities/`.

## R3 — File-Size Discipline

| File class                          | Max lines (production) |
| ----------------------------------- | :--------------------: |
| `*.service.ts` / `*.controller.ts`  |          300           |
| `*.manager.ts` / `*.adapter.ts`     |          500           |
| `*.utility.ts` / `*.repository.ts`  |          300           |
| `*.constants.ts` (catalogs allowed) |       unlimited        |
| Locale files / generated catalogs   |       unlimited        |

A file exceeding its ceiling MUST be split. Acceptable splits:

- Multiple files in the same directory by responsibility (e.g. `routing.manager.ts` → `routing-auto.manager.ts` + `routing-heuristic.manager.ts` + `routing-replay.manager.ts`)
- Sub-managers exposed via the same module
- Helper functions extracted to a utility file

## R4 — Logging-Coverage Discipline (added 2026-04-26)

Every public method in `*.service.ts`, `*.manager.ts`, `*.adapter.ts`, `*.utility.ts`, `*.repository.ts` MUST emit:

- `logger.debug(...)` on entry, with non-PII inputs (request id, user id, entity id, action name)
- `logger.info(...)` for any side-effecting operation (DB write, HTTP call, RabbitMQ publish, file write)
- `logger.warn(...)` for any retry, fallback, or recoverable degraded path
- `logger.error(...)` in every `catch` block, BEFORE rethrow or fallback

Reference template:

```ts
async doX(input: Input): Promise<Output> {
  this.logger.debug(`doX: input=${safeStringify(input)}`);
  try {
    const result = await this.somethingThatMightFail(input);
    this.logger.info(`doX: completed thingId=${result.id} durationMs=${duration}`);
    return result;
  } catch (error) {
    this.logger.error(`doX: failed — ${(error as Error).message}`);
    throw error;
  }
}
```

NEVER log: secrets, tokens, passwords, refresh tokens, API keys, full request/response bodies (they may contain credentials). Pino redaction config is already in place — extend it, don't bypass it.

`safeStringify` lives in `packages/shared-utilities/` (or per-service utility) and redacts: `password`, `token`, `apiKey`, `refreshToken`, `accessToken`, `secret`, `authorization`.

All logs ship automatically to MongoDB (`claw_server_logs`, TTL 30 days) via the existing Pino → RabbitMQ `log.server` → `claw-server-logs-service` pipeline. NO additional plumbing per service.

## R5 — Test-Coverage Discipline (≥92 % flagship)

Every microservice and the frontend MUST report **≥92 %** on all four jest/vitest metrics: statements, branches, functions, lines.

Per-service `jest.config.ts`:

```ts
coverageThreshold: {
  global: {
    statements: 92,
    branches: 92,
    functions: 92,
    lines: 92,
  },
},
```

Frontend `vitest.config.ts`:

```ts
coverage: {
  thresholds: {
    statements: 92,
    branches: 92,
    functions: 92,
    lines: 92,
  },
}
```

CI runs `npm run test -- --coverage` and fails on any metric drop. Coverage is ratcheted only upward — never lower a threshold to land a change.

Quality bar:

- No `.toBeDefined()`-only assertions
- No `xit`, `xdescribe`, `.skip()` (CI rejects)
- Mocks at boundaries only (DB, HTTP, RabbitMQ, ClamAV, Ollama). Never mock the unit under test.
- DTO fuzz tests for every Zod schema (valid + boundary + invalid + null/empty/overflow)
- Manager error-path tests required (every `catch` branch covered)

## R6 — Cross-Service Deduplication Discipline

If a utility, type, or constant lives identically in 2+ services, it is a bug.

| Shared kind   | Package                      | Examples                                                                                       |
| ------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Functions     | `packages/shared-utilities/` | jwt-verifier, http-client, crypto, url-safety, retry-policy, exponential-backoff, time helpers |
| Types         | `packages/shared-types/`     | event payloads, JwtPayload, HttpRequestOptions, HttpResponse                                   |
| Constants     | `packages/shared-constants/` | port assignments, exchange names, DEFAULT_HTTP_TIMEOUT                                         |
| RabbitMQ glue | `packages/shared-rabbitmq/`  | RabbitMQModule, RabbitMQService                                                                |
| Auth glue     | `packages/shared-auth/`      | AuthGuard, RolesGuard, decorators                                                              |

Migration rule: when extracting a duplicate, you MUST:

1. Add the utility/type/constant to the appropriate shared package
2. Replace ALL per-service copies with imports
3. DELETE the per-service files (do NOT leave them as wrappers)
4. Run typecheck + lint + test in every consumer service

## R7 — Per-Service Refactor Recipe (template)

Every per-service refactor commit MUST follow this exact recipe:

1. Read the service `CLAUDE.md` and existing source.
2. Adopt shared-utilities — replace local `jwt`/`http-client`/`crypto`/`url-safety`/`bearer` with imports from `@claw/shared-utilities`. DELETE local copies.
3. Extract every inline declaration per R1.
4. Replace string-literal unions with enums.
5. Split every method over the R2 ceiling. Extract helpers; reusable ones move to utility files.
6. Enrich logging on every public method per R4.
7. Backfill tests to ≥92 % coverage per R5. DTO fuzz, error paths, boundary cases, null/empty/overflow.
8. Run gates: `npm run lint && npm run typecheck && npm run test -- --coverage && npm run build`. All green.
9. Run `qa/test-<service>.sh`. 0 failures required.
10. Rebuild Docker container (stop → rm → rmi → build per memory `feedback_docker_rebuild`). Scan logs for `UnhandledPromiseRejection|FATAL`. 0 hits.
11. Update `apps/<service>/CLAUDE.md` if patterns changed; update `docs/04-backend/<service>.md` if architecture changed.
12. Commit: `refactor(<service>): adopt shared-utilities, extract inline declarations, split long methods, enrich logging, backfill tests to 92%`.

## R8 — Things to NEVER Do (Post-Refactor)

- Reintroduce a per-service `jwt.utility.ts` after dedup
- Reintroduce inline `type`/`interface`/`enum`/`const` in logic files
- Reintroduce string-literal unions for domain values
- Skip logging in a public method ("the method is too small to need it" — there is no such method)
- Lower a `coverageThreshold` to land a change
- Reintroduce a method >50 lines (service) or >80 lines (manager)
- Reintroduce a file >500 lines
- Use `console.log` anywhere, ever (`console.warn`/`console.error` only in `main.ts` bootstrap)
- Use `as unknown as X` to satisfy the type checker
- Use `eslint-disable` to bypass any of these rules
- Modify a service's pre-existing test mocks during a refactor (refactor preserves behaviour)
- Bundle a refactor with a feature change in the same commit

## R9 — Refactor Commit Hygiene

- One service per commit (so the diff is reviewable)
- Conventional-commit subject: `refactor(<service>): <one-line summary>` (max 100 chars)
- Body explains:
  - What inline declarations were extracted
  - What methods were split
  - What duplicates were removed
  - Coverage delta (from X % → ≥92 %)
- NEVER use `--amend` for refactor commits — always new commits
- NEVER use `--no-verify` — pre-commit gates pass on every refactor commit
- Include `Co-Authored-By:` footer for AI agent attribution

## R10 — When NOT to Refactor

- Don't refactor in a feature commit. Refactor commits stand alone.
- Don't refactor a file you don't have a test for. Add tests first, then refactor.
- Don't refactor + ratchet coverage threshold + change behaviour all at once. Land each separately.
- Don't refactor third-party-generated files (Prisma client, locale files, catalog generated).
- Don't refactor near a release freeze — wait until post-release.
