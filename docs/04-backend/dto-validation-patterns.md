# DTO and Validation Patterns

All input validation in ClawAI uses Zod schemas. Every endpoint validates its input before the service layer is invoked.

---

## Core Rules

1. **ALL input validated with Zod schemas** — no unvalidated data reaches services
2. **Every `z.string()` MUST have `.max()`** — prevent unbounded string inputs
3. **Every `z.array()` MUST have `.max()`** — prevent unbounded arrays
4. **DTOs go in `src/modules/<domain>/dto/<name>.dto.ts`**
5. **Export both the schema AND the inferred type**
6. **Use enums from `src/common/enums/`** — never inline string unions

---

## File Naming Convention

```
src/modules/<domain>/dto/
  create-<entity>.dto.ts      — POST body
  update-<entity>.dto.ts      — PATCH body
  list-<entity>-query.dto.ts  — GET query params
  <action>.dto.ts             — Other actions (login, assign-role, etc.)
```

---

## Schema + Type Export Pattern

Every DTO file exports both the Zod schema and the inferred TypeScript type:

```typescript
import { z } from 'zod';

export const createThreadSchema = z.object({
  title: z.string().max(200).optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  preferredProvider: z.string().max(100).optional(),
  preferredModel: z.string().max(100).optional(),
  systemPrompt: z.string().max(10000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
  contextPackIds: z.array(z.string().max(50)).max(20).optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;
```

---

## Validation Pipe Usage

Schemas are applied via `ZodValidationPipe` in controller decorators:

```typescript
// Body validation
@Body(new ZodValidationPipe(createThreadSchema)) dto: CreateThreadDto

// Query validation
@Query(new ZodValidationPipe(listThreadsQuerySchema)) query: ListThreadsQueryDto

// Full-method pipe
@UsePipes(new ZodValidationPipe(loginSchema))
async login(@Body() dto: LoginDto): Promise<LoginResult> { ... }
```

---

## ZodValidationPipe Implementation

```typescript
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new BadRequestException({ message: 'Validation failed', errors });
    }
    return result.data; // Returns parsed/transformed data
  }
}
```

The pipe returns `result.data`, which means Zod transforms (defaults, coercion) are applied.

---

## Common Schema Patterns

### String Fields

```typescript
// Required string with max length
name: z.string().min(1).max(200),

// Optional string
title: z.string().max(200).optional(),

// Email
email: z.string().email().max(254),

// Password with minimum strength
password: z.string().min(8).max(128),

// Content (large text)
content: z.string().min(1).max(50000),

// System prompt
systemPrompt: z.string().max(10000).optional(),
```

### Numeric Fields

```typescript
// Temperature (0-2 float)
temperature: z.number().min(0).max(2).optional(),

// Token count (positive integer)
maxTokens: z.number().int().min(1).max(100000).optional(),

// Priority (integer)
priority: z.number().int().min(0).max(1000).default(0),

// Port
port: z.number().int().min(1).max(65535),
```

### Enum Fields

```typescript
// Using nativeEnum with Prisma/shared enum
routingMode: z.nativeEnum(RoutingMode).optional(),
role: z.nativeEnum(UserRole),
provider: z.nativeEnum(ConnectorProvider),
status: z.nativeEnum(ConnectorStatus).optional(),
type: z.nativeEnum(MemoryType),

// NEVER use string unions
// BAD: z.enum(['AUTO', 'MANUAL_MODEL', 'LOCAL_ONLY'])
// GOOD: z.nativeEnum(RoutingMode)
```

### Array Fields

```typescript
// Array with max size
contextPackIds: z.array(z.string().max(50)).max(20).optional(),
fileIds: z.array(z.string().max(50)).max(10).optional(),
reasonTags: z.array(z.string().max(50)).max(20).default([]),
capabilities: z.array(z.string().max(100)).max(50).default([]),
```

### Boolean Fields

```typescript
isActive: z.boolean().default(true),
isPinned: z.boolean().optional(),
```

### JSON Fields

```typescript
// Arbitrary JSON config
config: z.record(z.unknown()),
metadata: z.record(z.unknown()).optional(),
```

### Date Fields

```typescript
startDate: z.string().datetime().optional(),
endDate: z.string().datetime().optional(),
```

---

## Query DTO Pattern (Pagination)

```typescript
export const listThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export type ListThreadsQueryDto = z.infer<typeof listThreadsQuerySchema>;
```

Key: Use `z.coerce.number()` for query params — they arrive as strings from the URL.

---

## Update DTO Pattern (Partial)

Update DTOs typically make all fields optional:

```typescript
export const updateThreadSchema = z.object({
  title: z.string().max(200).optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  preferredProvider: z.string().max(100).nullable().optional(),
  preferredModel: z.string().max(100).nullable().optional(),
  systemPrompt: z.string().max(10000).nullable().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(100000).nullable().optional(),
  contextPackIds: z.array(z.string().max(50)).max(20).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateThreadDto = z.infer<typeof updateThreadSchema>;
```

Use `.nullable()` for fields that can be explicitly set to null (clearing a value).

---

## Transform Pattern

Zod transforms can preprocess data:

```typescript
export const createMessageSchema = z.object({
  threadId: z.string().max(50),
  content: z.string().min(1).max(50000).transform((s) => s.trim()),
  fileIds: z.array(z.string().max(50)).max(10).optional(),
});
```

---

## Validation Error Response

When validation fails, the response follows this structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" },
    { "field": "password", "message": "String must contain at least 8 character(s)" }
  ],
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

## DTO Index by Service

| Service | DTOs |
|---------|------|
| auth | `login.dto.ts`, `refresh-token.dto.ts` |
| users | `create-user.dto.ts`, `update-user.dto.ts`, `list-users-query.dto.ts`, `change-role.dto.ts`, `change-password.dto.ts`, `update-preferences.dto.ts` |
| chat-threads | `create-thread.dto.ts`, `update-thread.dto.ts`, `list-threads-query.dto.ts` |
| chat-messages | `create-message.dto.ts`, `list-messages-query.dto.ts`, `set-feedback.dto.ts` |
| connectors | `create-connector.dto.ts`, `update-connector.dto.ts`, `list-connectors-query.dto.ts` |
| routing | `create-policy.dto.ts`, `update-policy.dto.ts`, `list-policies-query.dto.ts`, `evaluate-route.dto.ts` |
| memory | `create-memory.dto.ts`, `update-memory.dto.ts`, `list-memories-query.dto.ts` |
| context-packs | `create-context-pack.dto.ts`, `update-context-pack.dto.ts`, `add-context-pack-item.dto.ts` |
| files | `upload-file.dto.ts`, `list-files-query.dto.ts` |
| ollama | `pull-model.dto.ts`, `assign-role.dto.ts`, `generate.dto.ts`, `list-models-query.dto.ts`, `list-catalog-query.dto.ts` |
| image | `generate-image.dto.ts` (includes `ListImagesQueryDto`) |
| file-gen | `generate-file.dto.ts` (includes `ListFileGenerationsQueryDto`) |
| client-logs | `create-client-log.dto.ts`, `search-client-logs.dto.ts` |
| server-logs | `create-server-log.dto.ts`, `batch-create-server-logs.dto.ts`, `list-server-logs-query.dto.ts` |
