# ClawAI — Backend NPM Packages Reference

> Every third-party package used in backend services. Each entry covers: what it does, how we wrap it, key gotchas.

---

## Core NestJS Ecosystem

### `@nestjs/core` + `@nestjs/common`

**Version**: 10.4.x  
**Purpose**: Dependency injection container, decorators, lifecycle hooks, pipes, guards, interceptors, filters.  
**Gotcha**: Use `@SkipLogging()` on SSE controller methods — NestJS logging interceptors conflict with streaming.

### `@nestjs/microservices`

**Purpose**: RabbitMQ consumer integration. Enables `@EventPattern()` and `@MessagePattern()` decorators on controller methods.  
**Wrapper**: `packages/shared-rabbitmq` wraps the connection setup; services never import `@nestjs/microservices` directly.  
**Pattern**: Fire-and-forget events use `@EventPattern()`, RPC uses `@MessagePattern()`.

### `@nestjs/throttler`

**Purpose**: Rate limiting. Applied globally via `ThrottlerGuard` (100 req/min default).  
**Config**: `THROTTLE_TTL` and `THROTTLE_LIMIT` env vars.  
**Gotcha**: Use `@SkipThrottle()` on SSE endpoints — long-lived connections break rate limiting logic.

---

## Database

### `@prisma/client` + `prisma`

**Version**: 5.22.x  
**Purpose**: Type-safe PostgreSQL ORM. Each service has its own `schema.prisma` and generates its own client.  
**Client location**: `src/generated/prisma/` (gitignored, regenerated in Docker entrypoint)  
**Gotcha**: Never use raw SQL. Never import the generated client outside of repositories.  
**Migration command**: `npx prisma migrate dev --name <name>`

### `@nestjs/mongoose` + `mongoose`

**Purpose**: MongoDB ODM for audit, client-logs, and server-logs services.  
**Services using it**: claw-audit-service, claw-client-logs-service, claw-server-logs-service  
**Pattern**: Collections use `@Schema()` + `@Prop()` decorators, TTL indexes for auto-expiry (30d for logs).

---

## Messaging

### `amqplib`

**Purpose**: AMQP client for RabbitMQ. Never used directly — wrapped by `packages/shared-rabbitmq`.  
**Wrapper exports**: `RabbitMQService.publish()`, `RabbitMQModule` for DI setup  
**DLQ**: 3 retries with exponential backoff, then dead-letter queue `claw.events.dlq`

---

## Authentication and Security

### `jsonwebtoken`

**Purpose**: JWT sign and verify.  
**Wrapper**: `src/common/utilities/jwt.utility.ts` in each service  
**Gotcha**: Only `claw-auth-service` signs tokens. All other services only verify.

### `argon2`

**Purpose**: Password hashing using Argon2id variant.  
**Services**: claw-auth-service only  
**Wrapper**: `src/common/utilities/hashing.utility.ts`  
**Gotcha**: Never use bcrypt for new code — Argon2 is the standard.

### `helmet`

**Purpose**: Express/NestJS security headers (X-Frame-Options, HSTS, CSP, etc.).  
**Applied**: Globally in `main.ts` of every service via `app.use(helmet())`.

---

## Validation

### `zod`

**Version**: 3.24.x  
**Purpose**: Runtime DTO validation. All inputs validated at controller boundary.  
**Pattern**: Define schema + export inferred type:

```typescript
export const CreateConnectorSchema = z.object({ name: z.string().min(1).max(200) });
export type CreateConnectorDto = z.infer<typeof CreateConnectorSchema>;
```

**Gotcha**: Every `z.string()` needs `.max()`. Every `z.array()` needs `.max()`. No exceptions.

---

## Logging

### `pino` + `nestjs-pino`

**Purpose**: Structured JSON logging with automatic request/response logging.  
**Log levels**: `debug`, `info` (log), `warn`, `error` — `console.log` is forbidden.  
**Redaction**: `authorization`, `password`, `refreshToken`, `apiKey`, `token`, `secret` fields auto-redacted.  
**Correlation**: `X-Request-ID` header auto-added to all log entries.  
**Gotcha**: `autoLogging` must exclude SSE routes — pino tries to log response headers after SSE stream starts, causing "Cannot set headers after they are sent" crash.

---

## Caching

### `ioredis`

**Purpose**: Redis client for caching and pub/sub.  
**Wrapper**: `src/common/utilities/redis.utility.ts` in services that use it  
**Use cases**: Routing prompt cache (5-min TTL), session storage, rate limiting counters.

---

## File Processing

### `pdf-parse`

**Service**: claw-file-service  
**Wrapper**: `pdf-parser.utility.ts`  
**Purpose**: Extract plain text from PDF for chunking.

### `mammoth`

**Service**: claw-file-service  
**Wrapper**: `docx-parser.utility.ts`  
**Purpose**: Extract plain text (or HTML) from DOCX/Word documents.

### `file-type`

**Service**: claw-file-service  
**Wrapper**: `file-validator.utility.ts`  
**Purpose**: Detect actual file type from magic bytes (not relying on declared MIME type).

### `clamav.js`

**Service**: claw-file-service  
**Wrapper**: `clamav-scanner.utility.ts`  
**Purpose**: TCP INSTREAM protocol to ClamAV Docker container for virus scanning.  
**Config**: `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_ENABLED`  
**Gotcha**: Graceful degradation when ClamAV is unreachable (fail-safe: rejects upload, does not silently pass).

---

## CSV Generation

### `csv-stringify`

**Service**: claw-file-generation-service  
**Adapter**: `csv.adapter.ts`  
**Purpose**: Converts table data arrays to CSV format.

---

## HTTP Client

### Native `fetch` (Node 18+)

**Wrapper**: `http-client.utility.ts` or `http.utility.ts` in each service  
**Pattern**: Returns `{ ok: boolean, status: number, data: T }` — never throws on HTTP errors, caller checks `ok`.  
**Timeout**: Default 10s, configurable per call.

---

## Encryption

### Node.js `crypto` (built-in)

**Wrapper**: `crypto.utility.ts` in each service  
**Algorithm**: AES-256-GCM with random IV (16 bytes) + authentication tag  
**Used for**: Connector API keys, OAuth2 tokens, workspace secrets  
**Key**: `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes = 256 bits)
