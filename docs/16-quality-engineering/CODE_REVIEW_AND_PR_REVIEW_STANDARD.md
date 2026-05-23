# Code Review and PR Review Standard

> Every pull request must pass this review before merge. No exceptions.

---

## Review Process

### Who Reviews

- Every PR requires at least one reviewer who did not write the code.
- For changes touching auth, security, or encryption: two reviewers required.
- For changes touching shared packages (`packages/*`): reviewer must understand downstream impact on all 13 services.

### Review Workflow

1. Author opens PR with description following the template (summary, test plan, affected services).
2. Reviewer reads the PR description and understands the intent.
3. Reviewer checks every file in the diff against the checklist below.
4. Reviewer leaves comments with `[MUST FIX]` for blockers and `[SUGGESTION]` for improvements.
5. Author addresses all `[MUST FIX]` comments. Suggestions are discussed.
6. Reviewer re-reviews addressed comments.
7. PR is approved only when all checklist items pass.

---

## Section 1: Architecture Compliance

### 1.1 Controller Files (`*.controller.ts`)

Every controller method must follow the 3-line rule:

```typescript
// CORRECT
@Post()
async create(@Body() dto: CreateThreadDto, @CurrentUser() user: UserPayload): Promise<ChatThread> {
  return this.chatService.createThread(dto, user.id);
}

// WRONG - business logic in controller
@Post()
async create(@Body() dto: CreateThreadDto, @CurrentUser() user: UserPayload): Promise<ChatThread> {
  const existing = await this.chatService.findByTitle(dto.title, user.id);
  if (existing) {
    throw new ConflictException('Thread already exists');
  }
  const thread = await this.chatService.createThread(dto, user.id);
  await this.auditService.log('thread.created', thread.id);
  return thread;
}
```

Checklist:

- [ ] Each method is 3 lines max: extract params, call ONE service method, return
- [ ] No `try/catch` blocks
- [ ] No `throw` statements
- [ ] No direct database access
- [ ] No business logic (validation, transformation, conditional logic)
- [ ] One service call per endpoint
- [ ] Auth decorators present (`@Roles()`, `@Public()`, or default AuthGuard)

### 1.2 Service Files (`*.service.ts`)

- [ ] No method exceeds 30 lines (excluding imports and type annotations)
- [ ] Complex logic split into private helper methods
- [ ] Each public method does ONE thing
- [ ] Ownership/permission validation happens here (not in controller or repository)
- [ ] Event publishing happens here (not in controller)
- [ ] Errors thrown as `BusinessException` with machine-readable `code`
- [ ] Entity not found uses `EntityNotFoundException`

### 1.3 Manager Files (`*.manager.ts`)

- [ ] No method exceeds 80 lines
- [ ] Cyclomatic complexity does not exceed 15
- [ ] Each private helper is under 30 lines
- [ ] Clear method naming: `buildPromptString()`, `fetchConnectorConfig()`, `parseResponse()`
- [ ] Used for complex orchestration (multiple service calls, external APIs, retries)

### 1.4 Repository Files (`*.repository.ts`)

- [ ] Pure data access only -- no business logic
- [ ] No `throw` statements -- return data or null, let services decide
- [ ] Each method maps to ONE database operation
- [ ] Uses Prisma query builders or Mongoose methods -- no raw SQL
- [ ] No event publishing
- [ ] No logging of business decisions (only data access logging if needed)

### 1.5 Frontend TSX Files

- [ ] Pure render composition -- no business logic
- [ ] No inline hook definitions (`function useXxx()` inside a component file)
- [ ] No inline type/interface/enum definitions
- [ ] No inline constant definitions (except the component itself)
- [ ] No utility function definitions
- [ ] No SCREAMING_CASE constants
- [ ] At most ONE controller hook call per page/component
- [ ] No direct `useQuery`/`useMutation` calls -- wrapped in custom hooks
- [ ] No direct `useState`/`useEffect`/`useCallback` -- encapsulated in controller hook
- [ ] Handles loading state, empty state, error state, success state
- [ ] Uses `cn()` for conditional Tailwind classes
- [ ] Uses shadcn/ui for all form inputs (no raw HTML inputs)

### 1.6 Hook Files (`src/hooks/`)

- [ ] Single responsibility -- each hook does exactly one thing
- [ ] Max 50 lines (excluding imports and types)
- [ ] No inline type/interface/enum/constant definitions
- [ ] Controller hooks orchestrate smaller hooks, no direct business logic
- [ ] GET requests use `useQuery` with query key factory
- [ ] Mutations use `useMutation` with `onSuccess` invalidation

---

## Section 2: Type Safety

### 2.1 No `any`

- [ ] Zero occurrences of `any` type in production code
- [ ] Use `unknown` for truly unknown types, then narrow with type guards
- [ ] Use generics for reusable patterns
- [ ] Use proper types from `src/types/` or generated Prisma types
- [ ] Test files (`.spec.ts`, `.test.ts`) are exempt

### 2.2 Explicit Return Types

- [ ] Every public method has an explicit return type annotation
- [ ] Every exported function has an explicit return type
- [ ] Arrow function expressions in hook definitions have return types
- [ ] Exception: React component return types (inferred as `JSX.Element`)

### 2.3 Import Type Syntax

- [ ] Type-only imports use `import type { ... }` syntax
- [ ] Inline type imports use `import { type Foo, Bar }` style (consistent-type-imports rule)
- [ ] No circular imports between modules

### 2.4 Null Handling

- [ ] No `!` non-null assertion operator
- [ ] Repository return types that may be null are typed as `T | null`
- [ ] Service methods check for null before operating on data
- [ ] Frontend uses optional chaining (`?.`) for potentially undefined data
- [ ] Frontend renders fallback UI when data is null/undefined (not blank screen)
- [ ] `===` and `!==` used for all comparisons (never `==` or `!=`)

---

## Section 3: DTO and Schema Validation

### 3.1 Zod Schemas

- [ ] Every endpoint that accepts input has a Zod schema in `dto/` folder
- [ ] Schema file exports both the schema and the inferred type:
  ```typescript
  export const createThreadSchema = z.object({ ... });
  export type CreateThreadDto = z.infer<typeof createThreadSchema>;
  ```
- [ ] Schema is used in the controller via a Zod validation pipe

### 3.2 String Constraints

- [ ] Every `z.string()` has `.max()` -- no unbounded strings
- [ ] Reasonable limits: titles (200), descriptions (2000), content (50000), names (100)
- [ ] `.trim()` applied where whitespace padding is not meaningful
- [ ] `.min(1)` applied where empty strings are not valid

### 3.3 Array Constraints

- [ ] Every `z.array()` has `.max()` -- no unbounded arrays
- [ ] Reasonable limits based on business context (e.g., max 10 file attachments, max 50 context pack items)

### 3.4 Enum Validation

- [ ] Enum fields use `z.nativeEnum(MyEnum)`, not `z.enum(['a', 'b'])`
- [ ] Enum values from `shared-types` or local `enums/` folder
- [ ] No string literal unions for domain values

### 3.5 Error Responses

- [ ] Every error response includes a `messageKey` for frontend i18n
- [ ] MessageKeys follow pattern: `<entity>.<action>_<reason>` (e.g., `thread.create_not_found`)
- [ ] Error response body includes `statusCode`, `message`, `messageKey`, and optionally `details`

---

## Section 4: Enum Usage

- [ ] No string literal unions (`type Status = 'active' | 'inactive'`) -- use enums
- [ ] No raw string comparisons for domain values:

  ```typescript
  // WRONG
  if (connector.provider === 'openai') { ... }

  // CORRECT
  if (connector.provider === ConnectorProvider.OPENAI) { ... }
  ```

- [ ] New enums placed in correct location:
  - Backend local: `src/common/enums/<name>.enum.ts`
  - Cross-service: `packages/shared-types/src/enums/`
  - Frontend: `src/enums/<name>.enum.ts`
- [ ] Enum values are UPPER_SNAKE_CASE
- [ ] Enum names are PascalCase

---

## Section 5: Logging

### 5.1 Backend Logging

- [ ] Uses NestJS `Logger` class (not `console.log`, `console.info`, `console.debug`)
- [ ] `console.warn` and `console.error` are the ONLY allowed console methods
- [ ] Logger instance declared as `private readonly logger = new Logger(ClassName.name)`
- [ ] Meaningful messages with context:
  ```typescript
  this.logger.log(`Thread created: ${thread.id} by user: ${userId}`);
  ```
- [ ] No secrets in log messages: password, token, apiKey, secret, authorization, refreshToken, encryptedConfig

### 5.2 Frontend Logging

- [ ] Uses the logger utility from `src/utilities/` (not `console.log`)
- [ ] `console.warn` and `console.error` are the ONLY allowed console methods
- [ ] No sensitive data logged (tokens, passwords, API keys)

### 5.3 SSE Endpoints

- [ ] `@SkipLogging()` decorator applied to SSE controller methods
- [ ] `@SkipThrottle()` decorator applied to SSE endpoints
- [ ] SSE routes excluded from pino-http autoLogging in `app.module.ts`

---

## Section 6: Internationalization (i18n)

- [ ] No hardcoded user-facing text in components
- [ ] All new text keys added to ALL 8 locale files:
  - `src/lib/i18n/locales/en.ts`
  - `src/lib/i18n/locales/ar.ts`
  - `src/lib/i18n/locales/de.ts`
  - `src/lib/i18n/locales/es.ts`
  - `src/lib/i18n/locales/fr.ts`
  - `src/lib/i18n/locales/it.ts`
  - `src/lib/i18n/locales/pt.ts`
  - `src/lib/i18n/locales/ru.ts`
- [ ] Translation keys defined in `src/types/i18n.types.ts`
- [ ] Components use `t('key')` from `useTranslation()` for all displayed text
- [ ] Translations are contextually accurate (not just machine-translated)
- [ ] Arabic translations tested for RTL layout compatibility

---

## Section 7: Test Coverage

### 7.1 New Code

- [ ] Every new public method in a service has at least one unit test
- [ ] Every new Zod schema has validation tests:
  - Valid input passes and returns correct type
  - Missing required fields fail with appropriate error
  - Invalid types fail
  - Boundary values (max length, max array size) are tested
- [ ] Every new hook has a test verifying its behavior
- [ ] Every new utility function has tests covering edge cases

### 7.2 Bug Fixes

- [ ] Every bug fix has a regression test
- [ ] The regression test would have FAILED before the fix
- [ ] The regression test PASSES after the fix

### 7.3 Test Quality

- [ ] Tests test behavior, not implementation details
- [ ] Tests do not depend on execution order
- [ ] Tests do not depend on external services (mocked appropriately)
- [ ] Tests have descriptive names: `should return 404 when thread does not exist`
- [ ] Tests cover happy path AND error paths

---

## Section 8: Security

- [ ] No `dangerouslySetInnerHTML` usage
- [ ] No unescaped user input rendered in HTML
- [ ] No `eval()`, `new Function()`, or `Function()` calls
- [ ] No secrets in client-side code
- [ ] No secrets in `NEXT_PUBLIC_*` environment variables
- [ ] File uploads go through all 4 FileSecurityManager checks
- [ ] Auth guards present on all non-public endpoints
- [ ] Rate limiting configured (`@SkipThrottle()` only on SSE/health)
- [ ] CORS configured to allow only expected origins
- [ ] No sensitive data in URL query parameters (especially JWT tokens)
- [ ] Prisma ORM used for all database queries (no raw SQL)
- [ ] AES-256-GCM encryption for connector API keys
- [ ] Passwords hashed with argon2

---

## Section 9: Configuration Completeness

Every PR that introduces new functionality must update these files if affected. Reviewer must verify:

| File                                    | When to Update                            | Verified |
| --------------------------------------- | ----------------------------------------- | -------- |
| `.env.example`                          | New/renamed environment variable          | [ ]      |
| `.env`                                  | New variable with working dev value       | [ ]      |
| `scripts/install.sh`                    | New variable in generated .env block      | [ ]      |
| `scripts/install.ps1`                   | Same for Windows                          | [ ]      |
| `docker/docker-compose.dev.yml`         | New service, port, volume, DB, dependency | [ ]      |
| `docker/docker-compose.yml`             | Same for production                       | [ ]      |
| `docker/docker-compose.dev.ollama.yml`  | Same for dev+ollama                       | [ ]      |
| `docker/docker-compose.prod.ollama.yml` | Same for prod+ollama                      | [ ]      |
| `infra/nginx/nginx.conf`                | New route, SSE endpoint                   | [ ]      |
| `packages/shared-constants`             | New port, service name                    | [ ]      |
| `packages/shared-types`                 | New event pattern                         | [ ]      |
| `apps/claw-health-service`              | New service to health check               | [ ]      |
| `.github/workflows/ci.yml`              | New service in Prisma loop, test env vars | [ ]      |
| i18n locale files (8)                   | New user-facing text                      | [ ]      |
| `CLAUDE.md`                             | New pattern, service, env var, rule       | [ ]      |
| `docs/`                                 | Architecture change                       | [ ]      |
| Prisma migration                        | Schema change                             | [ ]      |
| Seed files                              | New default data                          | [ ]      |

---

## Section 10: PR Approval Criteria

### Hard Requirements (all must pass)

1. **TypeScript:** `npm run typecheck` reports 0 errors
2. **ESLint:** `npm run lint` reports 0 errors (warnings are acceptable if pre-existing)
3. **Tests:** `npm run test` reports all tests passing
4. **Build:** `npm run build` succeeds for all workspaces
5. **Review:** All checklist sections (1-9) reviewed and verified
6. **Comments:** All `[MUST FIX]` review comments resolved
7. **Commits:** Follow conventional commits format (`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`)

### Soft Requirements (should pass, discuss if not)

- Test coverage for new code is at least 80%
- No increase in tech debt without a tracked ticket
- Performance impact considered for hot paths (chat message flow, routing)
- No new dependencies without justification (and wrapper utility created)

### Rejection Criteria (immediate rejection if any apply)

- `any` type in production code
- `eslint-disable` comment without a tracked issue
- `console.log` in production code
- Secrets logged or exposed to client
- Missing auth guard on non-public endpoint
- Missing i18n for user-facing text
- Missing tests for new functionality
- Controller method with business logic
- Repository method with `throw`
- Raw SQL query
- String literal union for domain values
- `!` non-null assertion in production code
- `==` or `!=` comparison

---

## Review Comment Templates

### Architecture Violation

```
[MUST FIX] Architecture: Controller method contains business logic.
Move the validation to the service layer. Controllers must be 3-line methods:
extract params, call service, return result.
See: docs/16-quality-engineering/CODE_REVIEW_AND_PR_REVIEW_STANDARD.md Section 1.1
```

### Missing Validation

```
[MUST FIX] Validation: This z.string() has no .max() constraint.
Every string field must have a maximum length to prevent abuse.
Suggested: .max(200) for titles, .max(2000) for descriptions.
```

### Missing Test

```
[MUST FIX] Testing: This new public method has no test.
Add a unit test covering at least the happy path and one error path.
```

### Suggestion

```
[SUGGESTION] Consider extracting this 35-line method into two smaller methods:
- validateThreadOwnership() for the ownership check
- buildThreadResponse() for the response transformation
This improves readability and makes each piece independently testable.
```
