# CI/CD Pipeline

## Overview

ClawAI uses GitHub Actions for continuous integration and a pre-commit hook (Husky) for local quality enforcement. Every commit and pull request must pass a 4-job pipeline before merge. Locally, a 5-step pre-commit hook prevents broken code from reaching the repository.

---

## GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

**Triggers**:

- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

**Concurrency**: One workflow run per branch. New pushes cancel in-progress runs for the same branch.

### Pipeline Architecture

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

Lint, Typecheck, and Test run in parallel. Build runs only after all three pass.

### Job 1: Lint

**Purpose**: Enforce code style and ESLint rules across all workspaces.

**Steps**:

1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci --ignore-scripts`)
4. Build shared packages (shared-types, shared-constants, shared-rabbitmq, shared-auth)
5. Generate Prisma clients for all 8 Prisma services (auth, chat, connector, routing, memory, file, ollama, image)
6. Run `npm run lint`

**Failure means**: ESLint violations exist. Zero warnings allowed in CI.

### Job 2: Typecheck

**Purpose**: Verify TypeScript strict mode compliance across all workspaces.

**Steps**: Same setup as Lint, then runs `npm run typecheck`.

**Failure means**: Type errors exist. All services use `strict: true` in tsconfig.

### Job 3: Test

**Purpose**: Run all unit and integration tests.

**Steps**: Same setup as Lint/Typecheck, then runs `npm run test -- --passWithNoTests`.

**Environment variables** provided for services that validate config on import:

- `OLLAMA_DATABASE_URL` (dummy PostgreSQL URL)
- `OLLAMA_BASE_URL` (localhost:11434)
- `IMAGE_DATABASE_URL` (dummy PostgreSQL URL)
- `FILE_SERVICE_URL`, `CONNECTOR_SERVICE_URL`, `STABLE_DIFFUSION_URL`
- `REDIS_URL`, `RABBITMQ_URL`, `JWT_SECRET`

**Note**: Tests run without live databases. All database calls are mocked.

### Job 4: Build

**Purpose**: Verify that all services compile and produce valid production artifacts.

**Depends on**: Lint, Typecheck, and Test all passing.

**Steps**: Same setup, then runs `npm run build`.

**Failure means**: Compilation errors that were not caught by typecheck (e.g., module resolution issues, missing build artifacts).

### Shared Setup Pattern

Every job repeats these prerequisites because GitHub Actions jobs run on separate runners:

```bash
# 1. Install deps
npm ci --ignore-scripts

# 2. Build shared packages (order matters)
cd packages/shared-types && npx tsc
cd ../shared-constants && npx tsc
cd ../shared-rabbitmq && npx tsc
cd ../shared-auth && npx tsc

# 3. Generate Prisma clients
for svc in auth chat connector routing memory file ollama image; do
  cd apps/claw-${svc}-service && npx prisma generate && cd ../..
done
```

---

## Pre-Commit Hook

**Tool**: Husky (`.husky/pre-commit`)

The pre-commit hook runs 5 sequential steps. If any step fails, the commit is rejected.

### Step 1: Prettier (via lint-staged)

Formats all staged files according to project Prettier config. This step auto-fixes formatting and re-stages the files.

### Step 2: ESLint

```bash
npm run lint
```

Runs ESLint across all workspaces. Zero errors required. Enforces the full rule set documented in `CLAUDE.md`.

### Step 3: Typecheck

```bash
npm run typecheck
```

Runs `tsc --noEmit` across all workspaces with strict mode.

### Step 4: Build

```bash
npm run build
```

Builds all workspaces to verify compilation succeeds. Catches import issues and build configuration problems.

### Step 5: Test

```bash
npm run test
```

Runs the full test suite. All tests must pass.

### Bypassing the Hook

In exceptional cases (documentation-only changes, emergency fixes), the hook can be bypassed:

```bash
git commit --no-verify -m "docs: update README"
```

This should be used sparingly and only when you are confident the changes do not affect code quality.

---

## Quality Gates Summary

| Gate          | Scope          | Tool        | Threshold | Blocks     |
| ------------- | -------------- | ----------- | --------- | ---------- |
| Formatting    | Staged files   | Prettier    | Auto-fix  | Commit     |
| Linting       | All workspaces | ESLint 9    | 0 errors  | Commit, PR |
| Type checking | All workspaces | TypeScript  | 0 errors  | Commit, PR |
| Build         | All workspaces | tsc / Next  | 0 errors  | Commit, PR |
| Tests         | All workspaces | Jest/Vitest | All pass  | Commit, PR |

---

## Build Process

### Shared Packages (build order matters)

```
1. packages/shared-types      (enums, event payloads, auth types)
2. packages/shared-constants   (exchange name, ports, API prefix)
3. packages/shared-rabbitmq    (RabbitMQModule, StructuredLogger)
4. packages/shared-auth        (AuthGuard, RolesGuard, decorators)
```

Each package compiles TypeScript to JavaScript in its `dist/` folder. Downstream packages and services reference these via npm workspace resolution.

### Backend Services

Each NestJS service:

1. Generates its Prisma client (if applicable)
2. Compiles TypeScript via `tsc` using the service's `tsconfig.build.json`
3. Output goes to `dist/`

### Frontend

Next.js builds via `next build` with Turbopack, producing an optimized production bundle in `.next/`.

---

## Deployment Flow

### Development

1. Developer creates a feature branch from `develop`
2. Pre-commit hook enforces quality on every commit
3. PR opened against `develop` triggers CI pipeline
4. All 4 jobs must pass for PR to be mergeable
5. Code review required
6. Merge to `develop`

### Staging / Production

1. `develop` is periodically merged to `main`
2. CI runs on `main` push
3. Docker images can be built from `main` for deployment
4. Each service has its own Dockerfile for production builds

---

## Release Management

### Commit Convention

All commits must follow Conventional Commits format, enforced by commitlint:

```
<type>(<scope>): <subject>
```

**Allowed types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Subject rules**: max 100 characters, no sentence-case/start-case/pascal-case/upper-case.

**Examples**:

```
feat(chat): add file attachment support to messages
fix(routing): handle timeout in Ollama router fallback
docs: update API reference for connector endpoints
refactor(auth): extract token rotation to utility
```

### Version Strategy

ClawAI uses a monorepo with synchronized versioning. All services share the same version number. Version bumps are driven by the type of commits since the last release:

- `fix` commits trigger a **patch** bump (1.0.x)
- `feat` commits trigger a **minor** bump (1.x.0)
- `BREAKING CHANGE` footer triggers a **major** bump (x.0.0)

---

## Running CI Locally

To replicate the CI pipeline locally before pushing:

```bash
# Run all checks in sequence (same as CI)
npm run lint && npm run typecheck && npm run test && npm run build

# Or run specific checks
npm run lint                           # ESLint only
npm run typecheck                      # TypeScript only
npm run test                           # Tests only
npm run build                          # Build only

# Per-workspace
npm run lint --workspace=apps/claw-auth-service
npm run test --workspace=apps/claw-frontend
```

---

## Troubleshooting CI Failures

### Lint Fails in CI but Passes Locally

- Ensure shared packages are built (`cd packages/shared-types && npx tsc`, etc.)
- Ensure Prisma clients are generated
- Check that Node.js version matches (20.x)

### Typecheck Fails

- Often caused by missing Prisma client generation
- Check for `import type` violations (ESLint enforces `consistent-type-imports`)

### Test Fails in CI

- Tests must not depend on running databases (all DB calls must be mocked)
- Check that required environment variables are set in the CI env block
- Use `--passWithNoTests` to avoid failure when a workspace has no tests

### Build Fails After Lint/Typecheck Pass

- Usually indicates module resolution issues (circular imports, missing re-exports)
- Check that shared package build order is correct
