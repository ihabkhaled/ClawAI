# NPM Packages: Backend Services

All 13 backend NestJS services share a common dependency set. This document catalogs every production dependency with its version, purpose, and usage location.

## Core Framework

| Package                      | Version  | Purpose                                  | Used By        |
| ---------------------------- | -------- | ---------------------------------------- | -------------- |
| `@nestjs/common`             | ^11.1.0  | Core NestJS decorators, pipes, guards    | All services   |
| `@nestjs/core`               | ^11.1.0  | NestJS application bootstrap             | All services   |
| `@nestjs/platform-express`   | ^11.1.0  | Express HTTP adapter for NestJS          | All services   |
| `rxjs`                       | ^7.8.1   | Reactive extensions (NestJS internals)   | All services   |
| `reflect-metadata`           | ^0.2.2   | Decorator metadata (required by NestJS)  | All services   |

## Authentication and Security

| Package              | Version  | Purpose                                | Used By             |
| -------------------- | -------- | -------------------------------------- | ------------------- |
| `@nestjs/jwt`        | ^11.0.0  | JWT signing, verification, module      | auth, memory, file, audit, ollama, image, file-gen, client-logs, server-logs |
| `jsonwebtoken`       | ^9.0.2   | Low-level JWT operations               | All except health   |
| `argon2`             | ^0.41.0  | Password hashing (Argon2id)            | auth                |
| `helmet`             | ^8.1.0   | HTTP security headers (HSTS, CSP, etc.)| All services        |
| `@nestjs/throttler`  | ^6.5.0   | Rate limiting (100 req/min default)    | All services        |

## Database

| Package           | Version  | Purpose                               | Used By                    |
| ----------------- | -------- | ------------------------------------- | -------------------------- |
| `@prisma/client`  | ^5.20-22 | Prisma ORM client (type-safe queries) | auth, chat, connector, routing, memory, file, ollama, image, file-gen |
| `prisma`          | ^5.20-22 | Prisma CLI (migrations, generate)     | Same as @prisma/client     |
| `@nestjs/mongoose` | ^11.0.0 | NestJS Mongoose integration module    | audit, client-logs, server-logs |
| `mongoose`        | ^8.0.0   | MongoDB ODM                           | audit, client-logs, server-logs |

## Messaging and Caching

| Package    | Version  | Purpose                              | Used By              |
| ---------- | -------- | ------------------------------------ | -------------------- |
| `amqplib`  | ^0.10.4  | RabbitMQ client (AMQP 0-9-1)        | All except health    |
| `ioredis`  | ^5.4.0   | Redis client (session cache, caching)| All except health    |

## HTTP Client

| Package | Version | Purpose                               | Used By                    |
| ------- | ------- | ------------------------------------- | -------------------------- |
| `axios` | ^1.7.0  | HTTP client for inter-service calls   | health, ollama, image, file-gen |

## Logging

| Package       | Version  | Purpose                            | Used By      |
| ------------- | -------- | ---------------------------------- | ------------ |
| `nestjs-pino` | ^4.1.0   | NestJS Pino logger integration     | All services |
| `pino`        | ^9.4.0   | High-performance JSON logger       | All services |
| `pino-http`   | ^10.3.0  | HTTP request/response logging      | All services |
| `pino-pretty` | ^11.2.0  | Human-readable log formatting (dev)| All services |

### Pino Configuration

All services configure pino with:
- Log level from `LOG_LEVEL` env var (default: `info`)
- Redaction of sensitive fields: `authorization`, `password`, `refreshToken`, `apiKey`, `token`, `secret`
- `pino-pretty` for development, JSON for production
- Auto-logging with SSE route exclusion

## Validation

| Package | Version  | Purpose                                | Used By      |
| ------- | -------- | -------------------------------------- | ------------ |
| `zod`   | ^3.23-24 | Schema validation for DTOs and configs | All services |

### Zod Usage Pattern

```typescript
// Every DTO follows this pattern:
export const createUserSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).optional(),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;
```

## File Generation Libraries

| Package         | Version  | Purpose                     | Used By   |
| --------------- | -------- | --------------------------- | --------- |
| `pdfkit`        | ^0.15.0  | PDF document generation     | file-gen  |
| `docx`          | ^9.0.0   | Microsoft Word DOCX builder | file-gen  |
| `csv-stringify`  | ^6.5.0   | CSV formatting              | file-gen  |
| `markdown-it`   | ^14.1.0  | Markdown to HTML conversion | file-gen  |

## Shared Workspace Packages

| Package                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `@claw/shared-types`   | Enums, event patterns, type definitions      |
| `@claw/shared-constants` | Port numbers, service names, API prefix    |
| `@claw/shared-rabbitmq` | RabbitMQModule, RabbitMQService, StructuredLogger |
| `@claw/shared-auth`    | AuthGuard, RolesGuard, decorators            |

## Dev Dependencies (Shared Across All Services)

| Package               | Version  | Purpose                       |
| --------------------- | -------- | ----------------------------- |
| `@nestjs/cli`         | ^11.0.19 | NestJS CLI (build, generate)  |
| `@nestjs/schematics`  | ^11.0.10 | NestJS code generators        |
| `@nestjs/testing`     | ^11.1.0  | Testing utilities             |
| `typescript`          | ^5.6.0   | TypeScript compiler           |
| `jest`                | ^29.7.0  | Test runner                   |
| `ts-jest`             | ^29.2.0  | TypeScript support for Jest   |
| `eslint`              | ^9.11.0  | Linter                        |
| `prettier`            | ^3.3.0   | Code formatter                |
| `typescript-eslint`   | ^8.7.0   | TypeScript ESLint integration |
| `eslint-plugin-security` | ^3.0.1| Security-focused lint rules   |
| `eslint-plugin-unicorn` | ^56.0.0| Miscellaneous best practices  |
| `eslint-plugin-import-x` | ^4.3.0| Import ordering and validation|
| `@types/node`         | ^22.7.0  | Node.js type definitions      |
| `@types/express`      | ^4.17.21 | Express type definitions      |
| `@types/jest`         | ^29.5.13 | Jest type definitions         |
| `@types/amqplib`      | ^0.10.5  | AMQP type definitions         |
| `@types/jsonwebtoken` | ^9.0.7   | JWT type definitions          |
