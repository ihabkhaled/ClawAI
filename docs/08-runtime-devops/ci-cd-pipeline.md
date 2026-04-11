# CI/CD Pipeline

> GitHub Actions workflow, job details, Prisma generate loop, and pre-commit hooks.

---

## 1. Pipeline Architecture

**File**: `.github/workflows/ci.yml`

```
  +-------+     +-----------+     +------+
  | Lint  |     | Typecheck |     | Test |
  +---+---+     +-----+-----+     +--+---+
      |               |              |
      +-------+-------+--------------+
              |
          +---v---+
          | Build |
          +-------+
```

- **Lint, Typecheck, Test**: Run in parallel on separate runners
- **Build**: Runs only after all three pass (`needs: [lint, typecheck, test]`)

### Triggers

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Concurrency

One workflow per branch. New pushes cancel in-progress runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## 2. Shared Setup (Every Job)

Each job runs on a fresh `ubuntu-latest` runner and repeats these setup steps:

```bash
# 1. Checkout code
- uses: actions/checkout@v4

# 2. Setup Node.js 20 with npm cache
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm

# 3. Install dependencies (no lifecycle scripts)
- run: npm ci --ignore-scripts

# 4. Build shared packages (ORDER MATTERS)
- run: |
    cd packages/shared-types && npx tsc
    cd ../shared-constants && npx tsc
    cd ../shared-rabbitmq && npx tsc
    cd ../shared-auth && npx tsc

# 5. Generate Prisma clients for all services with Prisma
- run: |
    for svc in auth chat connector routing memory file ollama image file-generation; do
      cd apps/claw-${svc}-service && npx prisma generate && cd ../..
    done
```

### Why Shared Packages Must Build First

Services import types and constants from shared packages. Without building them first, TypeScript compilation fails with missing module errors.

### Prisma Generate Loop

Each Prisma service needs its client generated before linting, type-checking, or testing. The loop covers 9 services:

1. `claw-auth-service`
2. `claw-chat-service`
3. `claw-connector-service`
4. `claw-routing-service`
5. `claw-memory-service`
6. `claw-file-service`
7. `claw-ollama-service`
8. `claw-image-service`
9. `claw-file-generation-service`

---

## 3. Job Details

### Job 1: Lint

Runs `npm run lint` which executes ESLint across all workspaces.

**Failure means**: ESLint violations exist. Zero errors required.

### Job 2: Typecheck

Runs `npm run typecheck` which runs `tsc --noEmit` across all workspaces.

**Failure means**: TypeScript type errors exist. All services use `strict: true`.

### Job 3: Test

Runs `npm run test -- --passWithNoTests`.

**Environment variables** provided for services that validate config on import:

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

These are dummy values -- tests mock all database and external calls. The env vars are needed because NestJS services validate configuration with Zod on import.

**Failure means**: Unit or integration tests fail. `--passWithNoTests` allows workspaces with no tests to pass.

### Job 4: Build

Runs `npm run build` which builds all workspaces including the Next.js production build.

**Failure means**: Compilation errors, module resolution issues, or build configuration problems.

---

## 4. Pre-Commit Hook

**Tool**: Husky (`.husky/pre-commit`)

The pre-commit hook runs 5 sequential steps locally before every commit:

### Step 1: Prettier (lint-staged)

Formats all staged files and re-stages them.

### Step 2: ESLint

```bash
npm run lint
```

Zero errors required across all workspaces.

### Step 3: TypeScript

```bash
npm run typecheck
```

Zero type errors across all workspaces.

### Step 4: Build

```bash
npm run build
```

Production build must succeed.

### Step 5: Test

```bash
npm run test
```

All tests must pass.

---

## 5. Adding a New Service to CI

When adding a new backend service with Prisma:

1. Add to the Prisma generate loop in all 4 jobs:
   ```yaml
   for svc in auth chat connector routing memory file ollama image file-generation NEW_SERVICE; do
   ```

2. Add any required dummy env vars to the test job:
   ```yaml
   env:
     NEW_SERVICE_DATABASE_URL: postgresql://test:test@localhost:5432/test
   ```

3. Verify all 4 jobs pass: `npm run lint && npm run typecheck && npm run test && npm run build`

---

## 6. Commit Convention

Enforced by commitlint:

```
<type>(<scope>): <subject>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Rules**:
- Subject: max 100 characters
- No sentence-case, start-case, pascal-case, or upper-case
- Lowercase only

**Examples**:
```
feat(chat): add file attachment support
fix(routing): handle Ollama timeout
docs: update API reference
refactor(auth): extract token rotation logic
```

---

## 7. Running CI Locally

Replicate the full CI pipeline before pushing:

```bash
# All checks (same as CI)
npm run lint && npm run typecheck && npm run test && npm run build

# Individual checks
npm run lint
npm run typecheck
npm run test
npm run build

# Per-workspace
npm run lint --workspace=apps/claw-chat-service
npm run test --workspace=apps/claw-frontend
```

---

## 8. Troubleshooting CI Failures

### Lint fails in CI but passes locally

- Ensure shared packages are built first
- Ensure Prisma clients are generated
- Check Node.js version matches (20.x)

### Typecheck fails

- Often caused by missing Prisma client generation
- Check for `import type` violations

### Test fails in CI

- Tests must not depend on running databases (all mocked)
- Check env vars are set in the CI env block
- `--passWithNoTests` should be present

### Build fails after lint/typecheck pass

- Module resolution issues or circular imports
- Missing re-exports from shared packages
- Shared package build order incorrect
