# Security Architecture

## Overview

ClawAI implements defense-in-depth security across all 13 microservices and the frontend. Security is enforced at every layer: network (Nginx, CORS), transport (HTTPS), authentication (JWT), authorization (RBAC), input validation (Zod), data protection (AES-256-GCM encryption, log redaction), and runtime hardening (Helmet, rate limiting).

---

## Authentication Flow

### JWT + Refresh Token Rotation

ClawAI uses a dual-token authentication scheme with refresh token rotation to balance security and user experience.

```
Login Flow:

  Client                    Nginx              auth-service          PostgreSQL
    |                         |                     |                     |
    |--POST /auth/login------>|--forward----------->|                     |
    |                         |                     |--verify password--->|
    |                         |                     |  (argon2 compare)   |
    |                         |                     |<----- user row -----|
    |                         |                     |                     |
    |                         |                     |--create session---->|
    |                         |                     |  (refresh token,    |
    |                         |                     |   expiry, IP, UA)   |
    |                         |                     |                     |
    |<---- 200 OK ------------|<--------------------|                     |
    |  { accessToken,         |                     |                     |
    |    refreshToken }       |                     |                     |
```

### Token Specifications

| Token         | Lifetime                                                        | Storage                           | Contents                       |
| ------------- | --------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| Access Token  | Short-lived (configurable via `JWT_ACCESS_EXPIRY`, default 15m) | Memory (Zustand store)            | userId, email, role, sessionId |
| Refresh Token | Long-lived (configurable via `JWT_REFRESH_EXPIRY`, default 7d)  | httpOnly cookie or secure storage | sessionId, random jti          |

### Refresh Token Rotation

```
Refresh Flow:

  Client                    auth-service              PostgreSQL
    |                           |                         |
    |--POST /auth/refresh------>|                         |
    |  { refreshToken }         |                         |
    |                           |--lookup session-------->|
    |                           |  (by refresh token)     |
    |                           |<--- session row --------|
    |                           |                         |
    |                           |--validate:              |
    |                           |  - not expired          |
    |                           |  - not revoked          |
    |                           |                         |
    |                           |--rotate token:          |
    |                           |  - generate new refresh |
    |                           |  - invalidate old one   |
    |                           |  - update session------>|
    |                           |                         |
    |<---- 200 OK --------------|                         |
    |  { accessToken (new),     |                         |
    |    refreshToken (new) }   |                         |
```

**Rotation benefits**:

- If a refresh token is stolen and used, the legitimate user's next refresh will fail (token already rotated), triggering session invalidation
- Each refresh token is single-use
- Old refresh tokens cannot be replayed

### Password Security

- **Hashing algorithm**: argon2id (memory-hard, resistant to GPU/ASIC attacks)
- **Configuration**: Default argon2 parameters (memory cost, time cost, parallelism)
- **Password requirements**: Enforced via Zod schema validation at registration/change
- **No plaintext storage**: Passwords are never stored, logged, or transmitted in plaintext

### Session Management

- Sessions are stored in PostgreSQL (`Session` table in `claw_auth`)
- Each session tracks: userId, refreshToken hash, expiresAt, IP address, user agent
- Sessions can be revoked individually or all at once (force logout)
- Expired sessions are cleaned up periodically

---

## Authorization (RBAC)

### Role Hierarchy

```
ADMIN
  |-- Full access to all resources and operations
  |-- User management (create, update, delete, role assignment)
  |-- System settings management
  |-- Connector management
  |-- Routing policy management
  |
OPERATOR
  |-- Chat, memory, files, context packs (own resources)
  |-- View connectors (read-only)
  |-- View routing decisions (read-only)
  |-- View audit logs (read-only)
  |
VIEWER
  |-- Read-only access to chat threads (own only)
  |-- Read-only access to own memories
  |-- No create/update/delete operations
```

### RBAC Implementation

Authorization is enforced through two NestJS guards from the `shared-auth` package:

**AuthGuard** (applied globally):

1. Extracts JWT from `Authorization: Bearer <token>` header
2. Validates token signature using `JWT_SECRET`
3. Validates token expiry
4. Attaches decoded user to the request object (`request.user`)
5. Endpoints decorated with `@Public()` skip this guard

**RolesGuard** (applied per endpoint):

1. Reads allowed roles from `@Roles(UserRole.ADMIN, UserRole.OPERATOR)` decorator
2. Compares `request.user.role` against allowed roles
3. Returns 403 Forbidden if role is not in the allowed list
4. If no `@Roles()` decorator is present, all authenticated users are allowed

### Permission Matrix

| Resource           | ADMIN | OPERATOR   | VIEWER     |
| ------------------ | ----- | ---------- | ---------- |
| Users (CRUD)       | Full  | -          | -          |
| System Settings    | Full  | -          | -          |
| Connectors (CRUD)  | Full  | Read       | -          |
| Routing Policies   | Full  | Read       | -          |
| Chat Threads (own) | Full  | Full       | Read       |
| Chat Threads (all) | Full  | -          | -          |
| Chat Messages      | Full  | Full (own) | Read (own) |
| Memories (own)     | Full  | Full       | Read       |
| Context Packs      | Full  | Full       | Read       |
| Files (own)        | Full  | Full       | -          |
| Audit Logs         | Full  | Read       | -          |
| Usage Ledger       | Full  | Read       | -          |
| Ollama Models      | Full  | Read       | -          |
| Health Status      | Full  | Full       | Full       |

### Decorators

```typescript
@Public()           // Skip authentication entirely
@Roles(UserRole.ADMIN)  // Require ADMIN role
@CurrentUser()      // Extract user from request (parameter decorator)
```

---

## API Key Encryption (AES-256-GCM)

Cloud provider API keys (OpenAI, Anthropic, Google, DeepSeek, xAI) are encrypted at rest using AES-256-GCM.

### Encryption Flow

```
Connector Creation:

  User provides API key
       |
       v
  connector-service receives plaintext key
       |
       v
  Generate random 12-byte IV (initialization vector)
       |
       v
  Encrypt with AES-256-GCM:
    - Key: ENCRYPTION_KEY (64 hex chars = 256 bits from .env)
    - IV: random 12 bytes
    - Plaintext: API key
    - Output: ciphertext + 16-byte auth tag
       |
       v
  Store in database:
    encryptedConfig = base64(IV + ciphertext + authTag)
```

### Decryption Flow

```
When connector-service needs to call a cloud provider:

  Read encryptedConfig from database
       |
       v
  Decode base64 -> extract IV (12 bytes) + ciphertext + authTag (16 bytes)
       |
       v
  Decrypt with AES-256-GCM:
    - Key: ENCRYPTION_KEY
    - IV: extracted IV
    - Ciphertext: extracted ciphertext
    - AuthTag: extracted auth tag
    - Output: plaintext API key
       |
       v
  Use plaintext key for API call (never stored in memory longer than needed)
```

### Security Properties

- **Confidentiality**: AES-256 encryption ensures API keys cannot be read from the database
- **Integrity**: GCM auth tag detects any tampering with the ciphertext
- **Uniqueness**: Random IV per encryption ensures identical keys produce different ciphertexts
- **Key management**: `ENCRYPTION_KEY` is loaded from environment variables, never hardcoded

### Key Rotation

To rotate the encryption key:

1. Set new `ENCRYPTION_KEY` in environment
2. Run a migration script that decrypts all connector configs with the old key and re-encrypts with the new key
3. Restart connector-service

---

## Input Validation (Zod)

Every API endpoint validates its input using Zod schemas. This prevents injection attacks, buffer overflows, and malformed data from reaching business logic.

### Validation Rules

| Input Type      | Validation                     | Example                                  |
| --------------- | ------------------------------ | ---------------------------------------- |
| String fields   | `.max()` length limit          | `.string().max(10000)`                   |
| Arrays          | `.max()` size limit            | `.array().max(50)`                       |
| Email           | `.email()`                     | `z.string().email()`                     |
| UUID            | `.uuid()`                      | `z.string().uuid()`                      |
| Enum fields     | `.enum()` or `.nativeEnum()`   | `z.nativeEnum(RoutingMode)`              |
| Numbers         | `.min()` and `.max()`          | `z.number().min(0).max(2)` (temperature) |
| Optional fields | `.optional()` or `.nullable()` | `z.string().optional()`                  |
| Nested objects  | Composed schemas               | `z.object({ ... })`                      |

### Validation Pipeline

```
Request arrives
     |
     v
NestJS ValidationPipe (global)
     |
     v
Zod schema.parse(body/params/query)
     |
     +-- Valid: proceed to controller
     |
     +-- Invalid: throw ZodError -> GlobalExceptionFilter -> 400 response
              with field-level error messages
```

### Key Validation Constraints

- **Message content**: Max 50,000 characters
- **Thread title**: Max 200 characters
- **System prompt**: Max 10,000 characters
- **File uploads**: Max file size enforced at Nginx and application level
- **Array inputs**: Max 50 items (e.g., fileIds, contextPackIds)
- **Pagination**: Max page size 100, default 20

---

## Rate Limiting

Rate limiting prevents abuse and ensures fair resource usage across all services.

### Configuration

```
Default: 100 requests per minute per IP
Configurable via:
  THROTTLE_TTL=60000    (time window in milliseconds)
  THROTTLE_LIMIT=100    (max requests per window)
```

### Implementation

- Uses `@nestjs/throttler` module
- Applied globally to all 13 services
- Tracks requests by IP address
- Returns `429 Too Many Requests` when limit is exceeded
- Response includes `Retry-After` header

### Per-Endpoint Overrides

Critical endpoints can have tighter limits:

| Endpoint            | Limit   | Rationale                      |
| ------------------- | ------- | ------------------------------ |
| POST /auth/login    | 10/min  | Brute-force prevention         |
| POST /auth/refresh  | 20/min  | Token refresh abuse            |
| POST /chat-messages | 30/min  | LLM cost control               |
| POST /files/upload  | 10/min  | Storage abuse prevention       |
| GET /health         | 300/min | Monitoring needs higher limits |

---

## Security Headers (Helmet)

All 13 NestJS services use Helmet middleware to set security-related HTTP headers.

### Headers Set

| Header                              | Value                                 | Purpose                                      |
| ----------------------------------- | ------------------------------------- | -------------------------------------------- |
| `X-Content-Type-Options`            | `nosniff`                             | Prevent MIME type sniffing                   |
| `X-Frame-Options`                   | `SAMEORIGIN`                          | Prevent clickjacking                         |
| `X-XSS-Protection`                  | `0`                                   | Disable legacy XSS filter (CSP is preferred) |
| `Strict-Transport-Security`         | `max-age=31536000; includeSubDomains` | Force HTTPS (production)                     |
| `Content-Security-Policy`           | Restrictive policy                    | Prevent XSS, injection                       |
| `Referrer-Policy`                   | `strict-origin-when-cross-origin`     | Control referrer leakage                     |
| `X-DNS-Prefetch-Control`            | `off`                                 | Prevent DNS prefetch leakage                 |
| `X-Permitted-Cross-Domain-Policies` | `none`                                | Prevent Adobe cross-domain access            |

---

## Log Redaction

All services use Pino logger with automatic field redaction to prevent secrets from appearing in logs.

### Redacted Fields

```
- authorization     (JWT tokens in headers)
- password          (user passwords)
- refreshToken      (refresh tokens)
- apiKey            (provider API keys)
- token             (generic token fields)
- secret            (generic secret fields)
- encryptedConfig   (encrypted connector configs)
```

### Redaction Implementation

Pino's `redact` option replaces values of matching field paths with `[REDACTED]` before the log entry is serialized. This applies to:

- Request/response logging
- Error logging (error context objects)
- Event payloads logged during publishing/consuming
- Any object passed to `logger.info()`, `logger.warn()`, `logger.error()`

### What Is NOT Logged

In addition to redaction, certain data is never passed to the logger:

- Plaintext API keys (only the encrypted form exists in memory during transit)
- Full request bodies for authentication endpoints
- User passwords at any point in the flow
- File contents (only metadata is logged)

---

## Secrets Management

### Environment Variables

All secrets are loaded from a single `.env` file at the repository root (copied from `.env.example`).

| Secret              | Format                       | Purpose                            |
| ------------------- | ---------------------------- | ---------------------------------- |
| `JWT_SECRET`        | Random string (min 32 chars) | JWT signing key                    |
| `ENCRYPTION_KEY`    | 64 hex characters (256 bits) | AES-256-GCM key for API keys       |
| `PG_*_PASSWORD`     | String                       | PostgreSQL passwords (7 instances) |
| `MONGO_PASSWORD`    | String                       | MongoDB password                   |
| `RABBITMQ_PASSWORD` | String                       | RabbitMQ password                  |
| `REDIS_URL`         | Connection string            | May contain password               |
| `ADMIN_PASSWORD`    | String                       | Default admin user password        |

### Secret Handling Rules

1. **Never hardcode secrets** in source code
2. **Never commit `.env`** to version control (`.gitignore` includes it)
3. **Never log secrets** (Pino redaction enforced)
4. **Never expose secrets to the frontend** (no `NEXT_PUBLIC_` prefix for secrets)
5. **Use `AppConfig` (Zod-validated)** to access environment variables, never `process.env` directly
6. **Rotate secrets** periodically (JWT_SECRET, ENCRYPTION_KEY)

### AppConfig Pattern

Each service uses a Zod-validated configuration module:

```
Environment variable
     |
     v
AppConfig (Zod schema validates type, format, presence)
     |
     +-- Invalid: Service fails to start with clear error message
     |
     +-- Valid: Typed config object available via dependency injection
```

This ensures no service starts with missing or malformed configuration.

---

## CORS Policy

```
Allowed Origins: CORS_ORIGINS environment variable (comma-separated)
Default: http://localhost:3000 (frontend dev server)

Allowed Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Allowed Headers: Content-Type, Authorization, X-Request-ID
Credentials: true (cookies allowed for refresh token)
Max Age: 86400 (preflight cache for 24 hours)
```

CORS is enforced at both Nginx and NestJS levels for defense in depth.

---

## Threat Model

### Threat: Brute-Force Authentication

| Aspect        | Detail                                                   |
| ------------- | -------------------------------------------------------- |
| Attack        | Automated password guessing against /auth/login          |
| Mitigation    | Rate limiting (10 req/min on login), argon2 slow hashing |
| Detection     | Audit logging of failed login attempts                   |
| Residual risk | Low. Argon2 makes offline brute-force infeasible.        |

### Threat: Token Theft

| Aspect        | Detail                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Attack        | Stolen JWT access token used for unauthorized access                   |
| Mitigation    | Short token lifetime (15m), refresh token rotation, session revocation |
| Detection     | Anomalous usage patterns in audit logs                                 |
| Residual risk | Low. 15-minute window limits damage.                                   |

### Threat: API Key Exfiltration

| Aspect        | Detail                                                                         |
| ------------- | ------------------------------------------------------------------------------ |
| Attack        | Database breach exposes cloud provider API keys                                |
| Mitigation    | AES-256-GCM encryption at rest, ENCRYPTION_KEY in environment only             |
| Detection     | Database access auditing, anomalous connector usage                            |
| Residual risk | Medium. If both database and ENCRYPTION_KEY are compromised, keys are exposed. |

### Threat: Injection Attacks

| Aspect        | Detail                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------- |
| Attack        | SQL injection, NoSQL injection, prompt injection                                         |
| Mitigation    | Prisma ORM (parameterized queries), Mongoose schemas, Zod input validation               |
| Detection     | WAF rules (if deployed), log analysis                                                    |
| Residual risk | Low for SQL/NoSQL. Prompt injection is an inherent LLM risk mitigated by system prompts. |

### Threat: Privilege Escalation

| Aspect        | Detail                                                      |
| ------------- | ----------------------------------------------------------- |
| Attack        | User attempts to access resources outside their role        |
| Mitigation    | RBAC guards on every endpoint, ownership checks in services |
| Detection     | Audit logs record all 403 responses                         |
| Residual risk | Low. Guards are applied globally.                           |

### Threat: Denial of Service

| Aspect        | Detail                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| Attack        | Flood of requests to exhaust resources                                              |
| Mitigation    | Rate limiting, Nginx connection limits, file size limits                            |
| Detection     | Health service monitoring, log volume analysis                                      |
| Residual risk | Medium. Application-level DDoS requires infrastructure-level mitigation (CDN, WAF). |

### Threat: Data Exfiltration via Logs

| Aspect        | Detail                                                  |
| ------------- | ------------------------------------------------------- |
| Attack        | Sensitive data exposed in log files                     |
| Mitigation    | Pino log redaction, never logging passwords/tokens/keys |
| Detection     | Log auditing, automated secret scanning                 |
| Residual risk | Low. Redaction is automated and comprehensive.          |

### Threat: Man-in-the-Middle

| Aspect        | Detail                                                |
| ------------- | ----------------------------------------------------- |
| Attack        | Intercepting traffic between client and server        |
| Mitigation    | HTTPS in production, HSTS header, secure cookie flags |
| Detection     | Certificate transparency monitoring                   |
| Residual risk | Low when HTTPS is properly configured.                |

---

## Security Checklist for New Features

When adding new features, verify:

- [ ] All endpoints have `AuthGuard` (or explicit `@Public()` decorator)
- [ ] Appropriate `@Roles()` decorators are applied
- [ ] All input is validated with Zod schemas (with `.max()` limits)
- [ ] No secrets are logged or exposed in responses
- [ ] New environment variables are not prefixed with `NEXT_PUBLIC_` if they contain secrets
- [ ] Database queries use Prisma/Mongoose (no raw queries)
- [ ] Rate limiting is appropriate for the endpoint's sensitivity
- [ ] Audit events are published for security-relevant operations
- [ ] Error responses do not leak internal details (stack traces, SQL errors)
- [ ] File uploads are validated for type and size
