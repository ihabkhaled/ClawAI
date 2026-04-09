# Backend Coding Standards

Mandatory coding rules, patterns, and quality requirements for all 13 ClawAI NestJS backend services.

---

## Table of Contents

1. [Layer Architecture](#layer-architecture)
2. [Controller Rules](#controller-rules)
3. [Service Rules](#service-rules)
4. [Manager Rules](#manager-rules)
5. [Repository Rules](#repository-rules)
6. [Error Handling](#error-handling)
7. [DTO and Validation](#dto-and-validation)
8. [File Organization and Extraction Rules](#file-organization-and-extraction-rules)
9. [ESLint Rules Summary](#eslint-rules-summary)
10. [Library Wrapping Rule](#library-wrapping-rule)
11. [Absolute Code Rules](#absolute-code-rules)
12. [Testing Requirements](#testing-requirements)
13. [Code Quality Checklist](#code-quality-checklist)

---

## Layer Architecture

Every backend service follows a strict layered architecture:

```
Controller -> Service -> Repository (data access only)
                      -> Manager (complex logic, external calls)
```

Each layer has specific responsibilities and constraints. Violations of these boundaries produce maintainability and testability issues.

### Layer Dependency Rules

- Controllers depend on Services only (never Repositories or Managers directly)
- Services depend on Repositories and/or Managers
- Managers depend on Repositories and/or external APIs
- Repositories depend on Prisma Client or Mongoose only
- No circular dependencies between layers

---

## Controller Rules

Controllers are the thinnest possible layer. They exist only to map HTTP requests to service calls.

### Mandatory Constraints

1. **3-line methods ONLY**: Extract parameters, call ONE service method, return the result
2. **NO try/catch** -- errors are handled by the `GlobalExceptionFilter`
3. **NO throw statements** -- do not throw exceptions directly
4. **NO business logic** -- delegate everything to the service layer
5. **NO direct database access** -- never import repositories
6. **ONE service call per endpoint** -- never orchestrate multiple service calls
7. **NO inline type definitions** -- extract to `types/` files

### Correct Pattern

```typescript
@Post()
async create(
  @CurrentUser() user: AuthenticatedUser,
  @Body(new ZodValidationPipe(createSchema)) dto: CreateDto,
): Promise<Entity> {
  return this.entityService.create(user.id, dto);
}
```

### Anti-Patterns (NEVER do this)

```typescript
// BAD: Business logic in controller
@Post()
async create(@Body() dto: CreateDto): Promise<Entity> {
  const existing = await this.service.findByName(dto.name);
  if (existing) {
    throw new ConflictException('Already exists');  // NO throws
  }
  const result = await this.service.create(dto);
  await this.auditService.log('created', result);  // NO multiple service calls
  return result;
}
```

---

## Service Rules

Services contain business logic and orchestrate data access through repositories.

### Mandatory Constraints

1. **Max 30 lines per method** -- if longer, extract helper methods or delegate to a Manager
2. **Split complex methods** into smaller private methods
3. **Each public method does ONE thing**
4. **Validate ownership/permissions** here (not in controller or repository)
5. **Publish events** here (not in controller)
6. **Max complexity of 10** (ESLint `complexity` rule)

### Refactoring Strategy for Long Methods

When a service method exceeds 30 lines:

1. Extract validation logic to a private `validateX()` method
2. Extract transformation/mapping logic to a private `buildX()` or `mapX()` method
3. Move complex orchestration (multiple external calls, retries) to a Manager class
4. Extract reusable logic to utility files

### Correct Pattern

```typescript
async createMemory(userId: string, dto: CreateMemoryDto): Promise<MemoryRecord> {
  const record = await this.memoryRepository.create(userId, dto);
  await this.publishMemoryCreated(record);
  return record;
}

private async publishMemoryCreated(record: MemoryRecord): Promise<void> {
  await this.rabbitMQ.publish(EventPattern.MEMORY_EXTRACTED, {
    memoryId: record.id,
    userId: record.userId,
    type: record.type,
    content: record.content,
    timestamp: new Date().toISOString(),
  });
}
```

---

## Manager Rules

Managers handle complex orchestration that would make services too large.

### Mandatory Constraints

1. **Max 80 lines per method, complexity limit 15**
2. **Each private helper should be <30 lines**
3. **Clear naming**: `buildPromptString()`, `fetchConnectorConfig()`, `parseResponse()`
4. **Handle retries and fallbacks** here
5. **External API calls** go through managers, not services directly

### When to Use a Manager

- Multiple service calls that must be orchestrated
- External API interactions with retry logic
- Complex data transformation pipelines
- Operations that require fallback chains (e.g., `ChatExecutionManager`, `ContextAssemblyManager`)

---

## Repository Rules

Repositories are the sole data access layer. They are thin wrappers around Prisma or Mongoose queries.

### Mandatory Constraints

1. **Pure data access ONLY** -- no business logic
2. **NO throw statements** -- return data or `null`, let services decide error handling
3. **Each method maps to ONE database operation**
4. **Use Prisma/Mongoose query builders** -- no raw SQL
5. **No event publishing** -- repositories are data-only

### Correct Pattern

```typescript
async findById(id: string): Promise<Entity | null> {
  return this.prisma.entity.findUnique({ where: { id } });
}

async findByUserId(userId: string, page: number, limit: number): Promise<PaginatedResult<Entity>> {
  const [data, total] = await Promise.all([
    this.prisma.entity.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.entity.count({ where: { userId } }),
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
```

---

## Error Handling

### BusinessException

All domain errors use `BusinessException` with a machine-readable `code` string.

```typescript
import { BusinessException } from '../common/errors/business.exception';
import { HttpStatus } from '@nestjs/common';

// Entity not found
throw new EntityNotFoundException('Memory', id);

// Business rule violation
throw new BusinessException(
  'Cannot deactivate yourself',
  HttpStatus.FORBIDDEN,
  'CANNOT_DEACTIVATE_SELF',
);

// Generic bad request
throw new BusinessException('Invalid configuration', HttpStatus.BAD_REQUEST, 'INVALID_CONFIG');
```

### Error Hierarchy

| Exception Class           | HTTP Status                  | Usage                            |
| ------------------------- | ---------------------------- | -------------------------------- |
| `BusinessException`       | Varies (400, 403, 409, etc.) | General business rule violations |
| `EntityNotFoundException` | 404                          | Entity not found by ID           |
| `UnauthorizedException`   | 401                          | Missing or invalid JWT token     |
| `ForbiddenException`      | 403                          | Insufficient permissions (RBAC)  |

### Error Handling Rules

1. **NEVER swallow errors silently** -- always log and rethrow or handle explicitly
2. **NEVER use try/catch in controllers** -- the `GlobalExceptionFilter` handles all errors
3. **NEVER throw in repositories** -- return `null` and let services throw `EntityNotFoundException`
4. **Always include a machine-readable `code`** in `BusinessException`
5. **Log errors with context** -- include relevant IDs (userId, entityId, threadId)

### GlobalExceptionFilter Response Format

```json
{
  "statusCode": 404,
  "message": "Memory with ID abc-123 not found",
  "code": "ENTITY_NOT_FOUND",
  "timestamp": "2026-04-09T12:00:00.000Z",
  "path": "/api/v1/memories/abc-123"
}
```

---

## DTO and Validation

### Zod Schema Rules

All input validation uses Zod schemas. Every service uses Zod exclusively -- class-validator and class-transformer are not used.

1. **Every `z.string()` MUST have `.max()`** for length limits
2. **Every `z.array()` MUST have `.max()`** for size limits
3. **Schemas go in** `src/modules/<domain>/dto/<name>.dto.ts`
4. **Export both the schema and the inferred type**

### DTO File Pattern

```typescript
// src/modules/memory/dto/create-memory.dto.ts
import { z } from 'zod';
import { MemoryType } from '../../../common/enums';

export const createMemorySchema = z.object({
  type: z.nativeEnum(MemoryType),
  content: z.string().min(1).max(10000),
  sourceThreadId: z.string().uuid().optional(),
  sourceMessageId: z.string().uuid().optional(),
});

export type CreateMemoryDto = z.infer<typeof createMemorySchema>;
```

### Validation Pipe Usage

```typescript
// Method-level (preferred for single DTO)
@Post()
async create(
  @Body(new ZodValidationPipe(createSchema)) dto: CreateDto,
): Promise<Entity> { ... }

// Method-level with @UsePipes (when applied to entire method)
@Post()
@UsePipes(new ZodValidationPipe(createSchema))
async create(@Body() dto: CreateDto): Promise<Entity> { ... }
```

### Pagination Query DTOs

All list endpoints follow this pattern:

```typescript
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().max(200).optional(),
});

export type ListQueryDto = z.infer<typeof listQuerySchema>;
```

---

## File Organization and Extraction Rules

### Backend File Structure

```
src/
  app/
    config/           # AppConfig (Zod-validated env)
    decorators/       # Custom decorators (@Public, @Roles, @CurrentUser)
    filters/          # GlobalExceptionFilter
    guards/           # AuthGuard, RolesGuard
    interceptors/     # Logging, timing interceptors
    pipes/            # ZodValidationPipe
  common/
    constants/        # Shared constants for this service
    enums/            # Service-specific enums
    errors/           # BusinessException, EntityNotFoundException
    types/            # Common types (AuthenticatedUser, PaginatedResult)
    utilities/        # Library wrappers (jwt.utility.ts, hashing.utility.ts)
  modules/
    <domain>/
      controllers/    # HTTP controllers
      dto/            # Zod schemas + inferred types
      repositories/   # Data access (Prisma/Mongoose)
      services/       # Business logic
      managers/       # Complex orchestration (optional)
      types/          # Domain-specific types
      constants/      # Domain-specific constants
  generated/
    prisma/           # Auto-generated Prisma client
```

### Extraction Rules

Code elements MUST be extracted to their designated locations. Inline definitions in logic files are forbidden.

| Element            | Destination                                                                     | Rule                                                                          |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Types / Interfaces | `src/modules/<domain>/types/<name>.types.ts`                                    | NO inline `TSInterfaceDeclaration` or `TSTypeAliasDeclaration` in logic files |
| Enums              | `src/common/enums/<name>.enum.ts`                                               | NO inline `TSEnumDeclaration` in logic files                                  |
| Constants          | `src/common/constants/<name>.constants.ts` or `src/modules/<domain>/constants/` | NO top-level `const` in logic files                                           |
| Utilities          | `src/common/utilities/<name>.utility.ts`                                        | NO standalone `FunctionDeclaration` in logic files                            |
| DTOs               | `src/modules/<domain>/dto/<name>.dto.ts`                                        | Always co-locate schema and type                                              |
| Errors             | `src/common/errors/`                                                            | Custom exception classes                                                      |
| Pipes              | `src/app/pipes/`                                                                | Validation pipes                                                              |
| Guards             | `src/app/guards/`                                                               | Auth and role guards                                                          |
| Filters            | `src/app/filters/`                                                              | Exception filters                                                             |
| Interceptors       | `src/app/interceptors/`                                                         | Logging, timing                                                               |
| Decorators         | `src/app/decorators/`                                                           | Custom parameter/method decorators                                            |

### String Literal Unions

String literal unions (`'a' | 'b'`) are forbidden. Always use enums:

```typescript
// BAD
type Status = 'active' | 'inactive';

// GOOD
enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

---

## ESLint Rules Summary

All 13 backend services share an identical ESLint configuration. ESLint 9 flat config with 4 plugin groups.

### TypeScript Rules (Errors -- Build Fails)

| Rule                      | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `no-explicit-any`         | Use `unknown`, generics, or proper types instead of `any` |
| `no-unused-vars`          | No unused variables (except `_` prefixed)                 |
| `no-non-null-assertion`   | No `!` operator -- handle nullability explicitly          |
| `no-floating-promises`    | All promises must be awaited or voided                    |
| `no-misused-promises`     | No promises in boolean positions                          |
| `default-param-last`      | Default parameters must be last                           |
| `no-useless-empty-export` | No empty export statements                                |
| `no-loop-func`            | No function creation in loops                             |
| `return-await`            | Only use `return await` inside try-catch                  |

### TypeScript Rules (Warnings)

| Rule                            | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `consistent-type-imports`       | Prefer `import type` with inline style        |
| `explicit-function-return-type` | All functions must have explicit return types |
| `prefer-nullish-coalescing`     | Use `??` over `\|\|` for nullish values       |
| `prefer-optional-chain`         | Use `?.` over manual null checks              |
| `no-shadow`                     | No variable shadowing                         |

### Core JavaScript Rules (Errors)

| Rule                                          | Description                                                         |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `no-console`                                  | Only `console.warn` and `console.error` allowed (use NestJS Logger) |
| `eqeqeq`                                      | Always use `===` and `!==`                                          |
| `no-var`                                      | Use `const` or `let` only                                           |
| `prefer-const`                                | Use `const` when not reassigned                                     |
| `no-eval` / `no-implied-eval` / `no-new-func` | No dynamic code execution                                           |
| `prefer-template`                             | Use template literals over string concatenation                     |
| `no-param-reassign`                           | No parameter reassignment (props: false)                            |

### Security Plugin Rules

| Level        | Rules                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Errors**   | detect-eval-with-expression, detect-no-csrf, detect-buffer-noassert, detect-disable-mustache-escape, detect-new-buffer                                                |
| **Warnings** | detect-object-injection, detect-non-literal-regexp, detect-timing-attacks, detect-non-literal-fs, detect-child-process, detect-pseudoRandomBytes, detect-unsafe-regex |

### Unicorn Plugin Rules

| Level        | Rules                                                                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Errors**   | prefer-node-protocol, no-nested-ternary, prefer-string-slice                                                                                                                                              |
| **Warnings** | no-array-for-each, no-useless-undefined, prefer-ternary, prefer-array-find/some/includes, prefer-number-properties, no-lonely-if, no-array-push-push, prefer-spread, prefer-string-replace-all, prefer-at |

### Import Plugin Rules (Errors)

| Rule                       | Description                          |
| -------------------------- | ------------------------------------ |
| `no-duplicates`            | No duplicate imports (prefer-inline) |
| `first`                    | Imports must come first              |
| `newline-after-import`     | Blank line after import block        |
| `no-mutable-exports`       | No mutable exported bindings         |
| `no-self-import`           | No self-importing modules            |
| `no-useless-path-segments` | No unnecessary path segments         |

### File-Specific Method Limits

| File Type         | Max Lines/Method             | Max Complexity         |
| ----------------- | ---------------------------- | ---------------------- |
| `*.service.ts`    | 50                           | 10                     |
| `*.manager.ts`    | 80                           | 15                     |
| `*.controller.ts` | No limit (3-line convention) | No try/catch, no throw |
| `*.repository.ts` | No limit                     | No throw               |
| `*.spec.ts`       | All restrictions OFF         | `any` allowed          |

---

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file. Services and controllers NEVER import third-party packages directly.

### Why

- If the library changes or is replaced, only the wrapper file needs updating
- Provides a consistent API surface across the codebase
- Enables easier testing through mock injection
- Centralizes configuration

### Pattern

```
src/common/utilities/<library-name>.utility.ts
```

### Examples

| Library                | Wrapper File            | Exports                              |
| ---------------------- | ----------------------- | ------------------------------------ |
| `argon2`               | `hashing.utility.ts`    | `hashPassword()`, `verifyPassword()` |
| `jsonwebtoken`         | `jwt.utility.ts`        | `signToken()`, `verifyToken()`       |
| `crypto` (AES-256-GCM) | `encryption.utility.ts` | `encrypt()`, `decrypt()`             |
| `ioredis`              | `redis.utility.ts`      | Redis client factory                 |
| `axios` / `fetch`      | `http.utility.ts`       | `httpGet()`, `httpPost()`            |

### Anti-Pattern

```typescript
// BAD: Direct third-party import in service
import * as argon2 from 'argon2';

// GOOD: Import from wrapper
import { hashPassword, verifyPassword } from '../common/utilities/hashing.utility';
```

---

## Absolute Code Rules

These rules apply to ALL files in ALL backend services. Zero tolerance for violations.

| #   | Rule                                                 | Rationale                                             |
| --- | ---------------------------------------------------- | ----------------------------------------------------- |
| 1   | NEVER use `any`                                      | Use `unknown`, generics, or proper types              |
| 2   | NEVER disable ESLint rules                           | Fix the underlying issue                              |
| 3   | NEVER use string literal unions                      | Use enums from `src/enums/` or `src/common/enums/`    |
| 4   | NEVER compare domain values with raw strings         | Use enum comparisons                                  |
| 5   | NEVER log secrets, tokens, API keys, passwords       | Security violation                                    |
| 6   | NEVER allow missing explicit return types            | All functions typed                                   |
| 7   | NEVER build god-files                                | Keep modules focused and small                        |
| 8   | NEVER define types/interfaces/enums/constants inline | Extract to dedicated files                            |
| 9   | NEVER put business logic in controllers              | 3-line methods only                                   |
| 10  | NEVER put Prisma/Mongoose calls outside repositories | Repositories are the sole data layer                  |
| 11  | NEVER cross database boundaries                      | Use RabbitMQ or HTTP for inter-service data           |
| 12  | Each service owns its data                           | No shared databases                                   |
| 13  | Use `type` over `interface`                          | Unless declaration merging is needed                  |
| 14  | NEVER use `process.env` directly                     | Use AppConfig (Zod-validated)                         |
| 15  | NEVER use `console.log`                              | Use NestJS Logger                                     |
| 16  | NEVER use `!` non-null assertion                     | Handle nullability explicitly                         |
| 17  | NEVER use `==` or `!=`                               | Always use `===` and `!==`                            |
| 18  | NEVER use `var`                                      | Use `const`, or `let` only when reassignment required |
| 19  | NEVER add features without tests                     | Every new function needs a test                       |
| 20  | NEVER add user-facing text without i18n              | Extract to translation files                          |

---

## Testing Requirements

### General Rules

1. Every new function requires a corresponding test
2. Tests go in `*.spec.ts` files co-located with the source or in a `__tests__/` directory
3. All ESLint restrictions are OFF in test files -- `any` is allowed
4. Use Jest as the testing framework for all backend services

### Test Structure

```typescript
describe('MemoryService', () => {
  let service: MemoryService;
  let repository: jest.Mocked<MemoryRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: MemoryRepository, useValue: createMock<MemoryRepository>() },
      ],
    }).compile();

    service = module.get(MemoryService);
    repository = module.get(MemoryRepository);
  });

  describe('createMemory', () => {
    it('should create and return a memory record', async () => {
      // Arrange
      const dto = { type: MemoryType.FACT, content: 'Test content' };
      repository.create.mockResolvedValue(mockMemory);

      // Act
      const result = await service.createMemory('user-id', dto);

      // Assert
      expect(result).toEqual(mockMemory);
      expect(repository.create).toHaveBeenCalledWith('user-id', dto);
    });
  });
});
```

### What to Test

| Layer      | What to Test                                                   | What to Mock                   |
| ---------- | -------------------------------------------------------------- | ------------------------------ |
| Controller | HTTP status codes, parameter extraction, service delegation    | Service methods                |
| Service    | Business logic, validation, error conditions, event publishing | Repository, RabbitMQ, Managers |
| Manager    | Orchestration logic, retry behavior, fallback chains           | External APIs, Repositories    |
| Repository | Query construction, pagination math                            | Prisma/Mongoose client         |

### Test Commands

```bash
npm run test               # Run all tests across all workspaces
npm run test -- --watch    # Watch mode
npm run test -- --coverage # With coverage report
```

---

## Code Quality Checklist

Use this checklist before submitting any code change:

### Before Writing Code

- [ ] Understand which service owns the domain
- [ ] Check if types/enums already exist in shared packages or common directories
- [ ] Identify the correct layer (controller/service/manager/repository)

### While Writing Code

- [ ] All functions have explicit return types
- [ ] No `any` types anywhere
- [ ] All strings validated with `.max()` in Zod schemas
- [ ] All arrays validated with `.max()` in Zod schemas
- [ ] No inline type/enum/constant definitions
- [ ] Third-party libraries accessed through wrappers only
- [ ] No `process.env` -- using AppConfig
- [ ] No `console.log` -- using NestJS Logger
- [ ] No raw string comparisons for domain values -- using enums
- [ ] Error handling uses `BusinessException` with a `code`
- [ ] Controllers are 3-line methods with no logic
- [ ] Service methods are under 30 lines
- [ ] Manager methods are under 80 lines
- [ ] Repositories have no throw statements

### Before Committing

- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes (all tests green)
- [ ] New tests written for new functionality
- [ ] Prisma migrations created if schema changed
- [ ] Environment variables added to `.env.example`, `.env`, and install scripts
- [ ] i18n translations added for all 8 locales if user-facing text
- [ ] Documentation updated if architecture affected
- [ ] `CLAUDE.md` updated if new patterns or rules introduced
