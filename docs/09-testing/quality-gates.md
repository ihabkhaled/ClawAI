# Quality Gates

> Pre-commit hooks (5 steps), CI pipeline, and what must pass before merge.

---

## 1. Quality Gate Overview

ClawAI enforces quality at two levels:

| Gate           | When          | Tool         | Threshold | Blocks          |
| -------------- | ------------- | ------------ | --------- | --------------- |
| Formatting     | Pre-commit    | Prettier     | Auto-fix  | Commit          |
| Linting        | Pre-commit + CI | ESLint 9   | 0 errors  | Commit + PR     |
| Type checking  | Pre-commit + CI | TypeScript | 0 errors  | Commit + PR     |
| Build          | Pre-commit + CI | tsc / Next | 0 errors  | Commit + PR     |
| Tests          | Pre-commit + CI | Jest/Vitest| All pass  | Commit + PR     |
| Commit message | Commit        | commitlint   | Format    | Commit          |

---

## 2. Pre-Commit Hook (5 Steps)

**Tool**: Husky (`.husky/pre-commit`)

The hook runs 5 sequential steps. If ANY step fails, the commit is rejected.

### Step 1: Prettier (lint-staged)

Automatically formats all staged files according to project Prettier configuration. Files are re-staged after formatting.

**What it catches**: Inconsistent formatting, missing semicolons, line length violations.

### Step 2: ESLint

```bash
npm run lint
```

Runs ESLint across ALL workspaces (13 backend services + frontend + shared packages).

**What it catches**:
- `any` type usage
- `console.log` statements
- Missing `import type` syntax
- Inline type/enum/constant declarations
- String literal unions instead of enums
- Security anti-patterns
- Accessibility issues
- React hooks violations

### Step 3: TypeScript

```bash
npm run typecheck
```

Runs `tsc --noEmit` across all workspaces with `strict: true`.

**What it catches**:
- Type errors
- Missing return types
- Null safety violations
- Import resolution failures

### Step 4: Build

```bash
npm run build
```

Builds all workspaces for production.

**What it catches**:
- Module resolution issues
- Circular dependencies
- Missing exports
- Build configuration errors
- Next.js page/layout issues

### Step 5: Tests

```bash
npm run test
```

Runs the full test suite (Jest for backend, Vitest for frontend).

**What it catches**:
- Broken functionality
- Regression bugs
- Invalid test assertions

---

## 3. CI Pipeline (GitHub Actions)

**File**: `.github/workflows/ci.yml`

### Pipeline Structure

```
Push/PR to main or develop
    |
    +-- Job 1: Lint (ESLint)
    |
    +-- Job 2: Typecheck (TypeScript)
    |
    +-- Job 3: Test (Jest + Vitest)
    |
    +-------+-------+
            |
        Job 4: Build (all pass required)
```

Jobs 1-3 run in parallel. Job 4 runs only if all three pass.

### Setup Steps (Every Job)

Each job runs on a fresh runner and performs:

1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies: `npm ci --ignore-scripts`
4. Build shared packages in order:
   ```
   shared-types -> shared-constants -> shared-rabbitmq -> shared-auth
   ```
5. Generate Prisma clients for 9 services:
   ```
   auth, chat, connector, routing, memory, file, ollama, image, file-generation
   ```

### Test Job Environment Variables

```yaml
env:
  OLLAMA_DATABASE_URL: postgresql://test:test@localhost:5432/test
  OLLAMA_BASE_URL: http://localhost:11434
  IMAGE_DATABASE_URL: postgresql://test:test@localhost:5432/test
  FILE_SERVICE_URL: http://localhost:4006
  CONNECTOR_SERVICE_URL: http://localhost:4003
  STABLE_DIFFUSION_URL: http://localhost:7860
  FILE_GENERATION_DATABASE_URL: postgresql://test:test@localhost:5432/test
  FILE_GENERATION_SERVICE_URL: http://localhost:4013
  REDIS_URL: redis://localhost:6379
  RABBITMQ_URL: amqp://localhost:5672
  JWT_SECRET: ci-test-jwt-secret-9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
```

These are dummy values. Tests mock all external dependencies.

---

## 4. Commit Message Convention

Enforced by commitlint:

```
<type>(<scope>): <subject>
```

### Allowed Types

| Type       | Purpose                                  |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation only                       |
| `style`    | Formatting, no code change               |
| `refactor` | Code change without feature/fix          |
| `perf`     | Performance improvement                  |
| `test`     | Adding or updating tests                 |
| `build`    | Build system or dependencies             |
| `ci`       | CI configuration                         |
| `chore`    | Maintenance tasks                        |
| `revert`   | Reverting a previous commit              |

### Rules

- Subject: max 100 characters
- No sentence-case, start-case, pascal-case, or upper-case
- Scope is optional but recommended for clarity

### Examples

```
feat(chat): add file attachment support to messages
fix(routing): handle timeout in Ollama router fallback
docs: update deployment guide with SSL instructions
refactor(auth): extract token rotation to utility
test(memory): add unit tests for memory extraction
```

---

## 5. What Blocks a PR Merge

A PR cannot be merged unless ALL of the following pass in CI:

1. **Lint job**: 0 ESLint errors across all workspaces
2. **Typecheck job**: 0 TypeScript errors with strict mode
3. **Test job**: All Jest and Vitest tests pass
4. **Build job**: Production build succeeds for all services and frontend
5. **Code review**: At least one approval from a reviewer

---

## 6. Running Quality Checks Locally

Before pushing, replicate the full CI pipeline:

```bash
# Full pipeline (same as CI)
npm run lint && npm run typecheck && npm run test && npm run build

# Individual checks
npm run lint               # ESLint all workspaces
npm run typecheck          # TypeScript strict all workspaces
npm run test               # All tests
npm run build              # Production build

# Per workspace
npm run lint --workspace=apps/claw-chat-service
npm run typecheck --workspace=apps/claw-frontend
npm run test --workspace=apps/claw-auth-service
```

---

## 7. When Pre-Commit Hook Fails

1. **Read the error message** -- it tells you exactly which step failed
2. **Fix the issue** -- do not bypass the hook
3. **Re-stage the fixed files** -- `git add <fixed-files>`
4. **Create a NEW commit** -- do not amend the previous commit (the previous commit succeeded, this is a new change)
5. **Never use `--no-verify`** unless explicitly approved for documentation-only changes

### Common Failures and Fixes

| Failure                          | Fix                                           |
| -------------------------------- | --------------------------------------------- |
| ESLint: `no-explicit-any`        | Replace `any` with `unknown` or proper type   |
| ESLint: `no-console`             | Replace `console.log` with logger utility     |
| ESLint: inline type declaration  | Extract to `src/types/` or `src/enums/`       |
| TypeScript: missing return type  | Add explicit return type annotation            |
| TypeScript: null safety          | Add null check or use optional chaining        |
| Build: module not found          | Check imports, rebuild shared packages         |
| Test: assertion failure          | Fix the code or update the test               |

---

## 8. Quality Metrics Dashboard

The CI pipeline provides implicit quality metrics:

| Metric               | Where to Check                        |
| -------------------- | ------------------------------------- |
| ESLint violations    | CI Lint job output                    |
| Type errors          | CI Typecheck job output               |
| Test pass rate       | CI Test job output                    |
| Build success        | CI Build job output                   |
| Test coverage        | `npm run test -- --coverage`          |
| Bundle size          | `npm run build` output (frontend)     |

---

## 9. Mandatory Change Checklist

Every code change must consider updating:

1. `.env.example` -- new environment variables
2. `.env` -- working dev values
3. `scripts/install.sh` and `scripts/install.ps1` -- env generation
4. Docker Compose files -- new services, ports, volumes
5. `infra/nginx/nginx.conf` -- new routes
6. `packages/shared-constants` -- new service ports
7. `packages/shared-types` -- new event patterns
8. Health service -- new service URLs
9. `.github/workflows/ci.yml` -- Prisma generate loop, test env vars
10. i18n locale files (all 8) -- new user-facing text
11. Architecture docs -- if architecture changes
12. Prisma migrations -- schema changes
13. Seed files -- default data
14. Test files -- new tests for new code
15. Frontend types -- sync with backend changes
16. `CLAUDE.md` -- new patterns or rules

A feature is incomplete if any applicable item is missing.
