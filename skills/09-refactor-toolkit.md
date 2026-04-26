# Skill: Refactor Toolkit

> Use this skill when refactoring an existing service, when you spot a duplicate utility, when a method is too long, or when test coverage is below 92 %.
>
> Codified 2026-04-26 from the codebase-wide refactor (`.claude/Integrations/refactor__PLAN.md`). The full rule set lives in `rules/09-refactor-rules.md`.

---

## When to Use This Skill

- A service file is over 500 lines
- A method is over 50 lines (service) or 80 lines (manager)
- A utility lives identically in 2+ services
- Test coverage in a service is below 92 %
- A method has zero log statements
- An ESLint warning surfaces a `complexity > 10/15` or `max-lines-per-function`

## Per-Service Refactor Recipe

Every per-service refactor commit MUST follow this exact 12-step recipe.

### Step 1 — Read everything before touching anything

```bash
# Read the service-specific rules
cat apps/claw-<service>-service/CLAUDE.md

# Find the largest production files
find apps/claw-<service>-service/src -type f -name "*.ts" \
  -not -name "*.spec.ts" -not -path "*/__tests__/*" \
  -exec wc -l {} \; | sort -rn | head -10

# Find inline declarations to extract
grep -rE "^(export )?(interface|type|enum) [A-Z]" \
  apps/claw-<service>-service/src \
  --include="*.service.ts" --include="*.manager.ts" \
  --include="*.controller.ts" --include="*.repository.ts" \
  --include="*.adapter.ts"

# Find string-literal unions
grep -rE "type [A-Z]\w+ = ['\"][a-zA-Z]" apps/claw-<service>-service/src

# Run baseline lint to see all warnings
cd apps/claw-<service>-service && npm run lint 2>&1 | tee /tmp/lint-before.log

# Run baseline coverage
npm run test -- --coverage 2>&1 | tee /tmp/cov-before.log
```

### Step 2 — Adopt shared-utilities

```bash
# List utilities in this service
ls apps/claw-<service>-service/src/common/utilities/

# For each utility, check if it lives in shared-utilities or another service
diff apps/claw-<service>-service/src/common/utilities/jwt.utility.ts \
     packages/shared-utilities/src/jwt-verifier/jwt.utility.ts

# If identical (or near-identical), adopt:
#   1. Edit imports in service code: from '../common/utilities/jwt.utility' → from '@claw/shared-utilities'
#   2. DELETE the per-service copy
#   3. Run typecheck: npm run typecheck
```

Common candidates for shared-utilities (per Phase A audit):

- `jwt.utility.ts` (verifier) — 13 services have identical copies
- `http-client.utility.ts` — 7 services, two flavours (fetch vs axios)
- `crypto.utility.ts` — 4 services
- `url-safety.utility.ts` — 2 services
- `bearer.utility.ts` — chat-only today, but pattern leaks into many controllers

### Step 3 — Extract every inline declaration

| Inline thing                | Move to                                      |
| --------------------------- | -------------------------------------------- |
| `interface X { ... }`       | `src/modules/<domain>/types/<name>.types.ts` |
| `type X = { ... }`          | `src/modules/<domain>/types/<name>.types.ts` |
| `enum X { ... }`            | `src/common/enums/<name>.enum.ts`            |
| `const FOO = ...`           | `src/common/constants/<name>.constants.ts`   |
| `function helper() { ... }` | `src/common/utilities/<name>.utility.ts`     |
| `type Mode = 'a' \| 'b'`    | enum in `src/common/enums/`                  |

After extraction, run `npm run lint` to verify zero `no-restricted-syntax` violations in the changed files.

### Step 4 — Replace string-literal unions with enums

```ts
// Before
type RoutingMode = 'auto' | 'manual' | 'privacy_first';

// After (in src/common/enums/routing-mode.enum.ts)
export enum RoutingMode {
  AUTO = 'auto',
  MANUAL = 'manual',
  PRIVACY_FIRST = 'privacy_first',
}
```

Then update every consumer to import from the enum file.

### Step 5 — Split every over-length method

```ts
// Before — 120-line manager method
async handleAuto(message: Message): Promise<RoutingDecision> {
  // 120 lines of validation, classification, fallback, persistence...
}

// After — split into private helpers, each <40 lines
async handleAuto(message: Message): Promise<RoutingDecision> {
  const classification = await this.classify(message);
  const candidate = this.selectCandidate(classification);
  const validated = await this.validateRoute(candidate);
  return this.persistDecision(validated, message);
}

private async classify(message: Message): Promise<Classification> { /* <40 lines */ }
private selectCandidate(c: Classification): Candidate { /* <40 lines */ }
private async validateRoute(c: Candidate): Promise<Validated> { /* <40 lines */ }
private async persistDecision(v: Validated, m: Message): Promise<RoutingDecision> { /* <40 lines */ }
```

If a private helper is reusable across managers/services, extract to `src/common/utilities/<name>.utility.ts`. If reusable across services, extract to `packages/shared-utilities/`.

### Step 6 — Enrich logging on every public method

Every public method MUST emit:

- `logger.debug(...)` on entry
- `logger.error(...)` in every `catch` block
- `logger.info(...)` for any side-effecting operation
- `logger.warn(...)` for any retry / fallback / degraded path

See `docs/16-quality-engineering/LOGGING_COVERAGE_STANDARD.md` for full templates.

### Step 7 — Backfill tests to ≥92 %

For each public method without a test, add a `*.spec.ts` covering:

1. Happy path
2. Empty/null input
3. Boundary values (max length, exactly at limit)
4. Invalid input (wrong type, wrong enum, out of range)
5. Error path (mock returns null, mock throws, dependency fails)
6. Concurrent / idempotent (same call twice)

DTO fuzz tests for every Zod schema (valid + boundary + invalid).

Manager error-path tests for every `catch` branch.

### Step 8 — Run all gates

```bash
cd apps/claw-<service>-service
npm run lint           # → 0 errors
npm run typecheck      # → 0 errors
npm run test -- --coverage  # → all pass, ≥92 % all metrics
npm run build          # → success
```

Fix any failure before proceeding. Do NOT use `--no-verify` to bypass.

### Step 9 — Run the QA script

```bash
bash qa/test-<service>.sh
```

0 failures required. If a test fails, the refactor changed behaviour. Investigate before proceeding.

### Step 10 — Rebuild Docker container and scan logs

```bash
docker compose -f docker-compose.dev.yml stop <service>
docker compose -f docker-compose.dev.yml rm -f <service>
docker rmi claw-<service>-service
docker compose -f docker-compose.dev.yml up -d --build <service>

# Wait for healthy
docker compose -f docker-compose.dev.yml ps <service>

# Scan logs for errors
docker compose -f docker-compose.dev.yml logs <service> --tail=200 | \
  grep -cE "UnhandledPromiseRejection|FATAL|Cannot read properties of undefined"
# Must be 0
```

### Step 11 — Update docs

- `apps/claw-<service>-service/CLAUDE.md` — note any pattern changes
- `docs/04-backend/<service>.md` — note any architecture changes (if file exists)
- `CLAUDE.md` (root) — only if a new pattern was introduced (rare)

### Step 12 — Commit

```bash
git add -A
git commit -m "refactor(<service>): adopt shared-utilities, extract inline declarations, split long methods, enrich logging, backfill tests to 92%"
```

The commit body should describe:

- What inline declarations were extracted (file paths)
- What methods were split (manager / service / utility)
- What duplicates were removed (which utilities moved to shared-utilities)
- Coverage delta (from X % → Y %)

## Common Pitfalls

### Pitfall 1: Refactor + behaviour change in same commit

Don't. Refactor preserves behaviour, period. If you find a bug while refactoring, write a test for the bug, fix in a separate commit AFTER the refactor lands.

### Pitfall 2: Lowering coverage threshold to land

Don't. The 92 % floor is non-negotiable. If your refactor drops coverage, you missed a test for an extracted helper. Add the test.

### Pitfall 3: Leaving per-service utility as a wrapper around shared-utility

Don't. Delete the per-service file. Update all imports to point to `@claw/shared-utilities`.

### Pitfall 4: Touching test mocks during refactor

Don't. The existing tests are the contract. If a test fails, the refactor broke behaviour. Fix the production code, not the test.

### Pitfall 5: Bundling multiple services in one commit

Don't. One service per commit. Reviewers can't diff a 50-file mixed commit reliably.

### Pitfall 6: Missing logging on small methods

Don't skip the smallest methods. The 3-line method also needs `logger.debug` on entry — and `logger.error` if it has a catch. There is no "too small" method.

### Pitfall 7: Forgetting to update CODEX.md and cursor.md

Don't. CLAUDE.md, CODEX.md, and cursor.md are mirrors. Update all three together — never one alone.

## Reference

- `rules/09-refactor-rules.md` — Full refactor rule set
- `docs/16-quality-engineering/LOGGING_COVERAGE_STANDARD.md` — Logging coverage standard
- `docs/16-quality-engineering/TDD_AND_UNIT_TESTING_STANDARD.md` — Test coverage standard
- `.claude/Integrations/refactor__PLAN.md` — The codebase-wide refactor plan (Phase A audit results)
- `packages/shared-utilities/README.md` — Catalogue of shared utilities
