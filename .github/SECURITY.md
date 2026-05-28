# Security

Security practices, mechanisms, and considerations for the Claw platform.

---

## Microservices Security Model

Claw's microservices architecture provides security through isolation:

- **Network isolation**: All services communicate over a Docker bridge network; only Nginx (4000), the frontend (3000), and management ports are exposed to the host
- **Database-per-service**: 12 independent PostgreSQL instances + MongoDB; a compromise of one database does not expose another service's data
- **Independent authentication**: Every microservice validates JWTs independently using `@claw/shared-auth`
- **Async messaging security**: RabbitMQ connections use authenticated credentials; services only consume messages from their subscribed routing keys

---

## Secret Handling

### Encryption at Rest (AES-256-GCM)

All sensitive credentials (provider API keys, connector secrets) are encrypted before storage:

- **Algorithm**: AES-256-GCM (authenticated encryption with associated data)
- **Key**: 32-byte key from the `ENCRYPTION_KEY` environment variable (64 hex characters)
- **IV**: Unique 12-byte initialization vector generated per encryption operation
- **Auth Tag**: 16-byte tag stored alongside ciphertext to detect tampering

Stored payload format: `Base64(IV + AuthTag + Ciphertext)`

### Key Management

- `ENCRYPTION_KEY` stored only in the environment, never in the database or source code
- Rotation requires re-encrypting all stored secrets with the new key
- Generate with: `openssl rand -hex 32`

### What Is Encrypted

| Data                   | Protection  | Storage Location       | Service   |
| ---------------------- | ----------- | ---------------------- | --------- |
| Provider API keys      | AES-256-GCM | `connectors` table     | Connector |
| AWS secret access keys | AES-256-GCM | `connectors` table     | Connector |
| Workspace OAuth tokens | AES-256-GCM | `workspace_connectors` | Workspace |
| User passwords         | argon2id    | `users` table          | Auth      |
| Refresh tokens         | Hashed      | `sessions` table       | Auth      |
| JWT secrets            | N/A         | Environment only       | All       |

### Secret Handling Per Service

| Service         | Secrets Accessed                                      |
| --------------- | ----------------------------------------------------- |
| Auth            | JWT_SECRET, password hashes                           |
| Chat            | JWT_SECRET (validation only)                          |
| Connector       | JWT_SECRET, ENCRYPTION_KEY, provider API keys         |
| Routing         | JWT_SECRET                                            |
| Memory          | JWT_SECRET                                            |
| File            | JWT_SECRET                                            |
| Audit           | JWT_SECRET                                            |
| Ollama Service  | JWT_SECRET, OLLAMA_BASE_URL                           |
| Health          | No secrets (stateless aggregator)                     |
| Client Logs     | JWT_SECRET                                            |
| Server Logs     | JWT_SECRET                                            |
| Image           | JWT_SECRET, provider API keys (via connector service) |
| File Generation | JWT_SECRET                                            |
| Agent           | JWT_SECRET, agent session tokens                      |
| Research        | JWT_SECRET, TAVILY_API_KEY, SEARXNG_BASE_URL          |
| Workspace       | JWT_SECRET, ENCRYPTION_KEY, workspace OAuth tokens    |

---

## Authentication

### Password Hashing

- **Algorithm**: argon2id (memory-hard, GPU/ASIC resistant)
- Recommended by OWASP for server-side password hashing
- Parameters follow OWASP recommendations
- Password operations handled exclusively by the Auth service

### JWT

- **Access tokens**: Short-lived (default 15 min), contain user ID and role
- **Refresh tokens**: Longer-lived (default 7 days), for obtaining new access tokens
- **Signing**: HMAC-SHA256 with `JWT_SECRET`
- **Validation**: Every microservice validates JWTs independently (no single point of failure)
- **SSE note**: Never pass JWT tokens in URL query params — they leak in server logs, browser history, and Referer headers. Frontend SSE client uses `fetch()` with `Authorization: Bearer` header

### Refresh Token Rotation

On each use:

1. Auth service verifies the token against the stored hash
2. Old token is invalidated immediately
3. New access + refresh token pair is issued
4. New refresh token hash replaces the old one

This limits the damage window — each refresh token can only be used once.

### Session Invalidation

- Logout invalidates all refresh tokens for the user
- Admin users can force-invalidate all sessions for any user
- Expired tokens are periodically cleaned from the database

---

## Authorization

### Role-Based Access Control (RBAC)

| Role       | Capabilities                                                          |
| ---------- | --------------------------------------------------------------------- |
| `ADMIN`    | Full access: manage users, connectors, routing rules, view all audits |
| `OPERATOR` | Manage connectors and routing; cannot manage users                    |
| `VIEWER`   | Read-only access to chat and observability                            |

### Guard Implementation

Enforced via NestJS guards from `@claw/shared-auth`:

- **`AuthGuard`**: Verifies JWT validity; attaches user to request
- **`RolesGuard`**: Checks user role against `@Roles()` decorator
- All endpoints except `/auth/login`, `/auth/register`, and `/health` require authentication
- Each microservice applies guards independently

### Resource Ownership

Beyond role checks, services enforce ownership:

- Users can only access their own chat threads and messages
- Users can only view and modify their own profile
- Connectors are shared resources managed by admins and operators

---

## File Upload Security

Every uploaded file passes 4 security checks before storage:

### 1. Antivirus Scan (ClamAV)

- ClamAV Docker container (`clamav/clamav-debian:stable`, port 3310)
- Files sent via TCP INSTREAM protocol
- **Fail-closed**: if ClamAV is down, upload is rejected (not allowed through)
- Configure: `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_ENABLED`

### 2. Magic Byte Validation

- Verifies file content matches declared MIME type
- Checked types: PDF (`%PDF`), PNG (`\x89PNG`), JPEG (`\xFF\xD8\xFF`), GIF (`GIF8`), WebP, ZIP/DOCX
- Declared type mismatch → HTTP 422 `INVALID_FILE_TYPE`

### 3. Filename Validation

- Blocks path traversal attempts (`../`, `\`, `/` in filename)
- Blocks null bytes (`\0`)
- Blocks double extensions (`.exe.pdf`, `.php.jpg`)
- Blocks 30+ dangerous extensions: `.exe`, `.dll`, `.bat`, `.ps1`, `.vbs`, `.sh`, `.cmd`, `.msi`, etc.
- Filenames sanitized before storage (special chars replaced with underscores)

### 4. ZIP Bomb Detection

- Detects suspicious null byte patterns in archive files
- Prevents decompression bombs from crashing the file service

Failed checks return HTTP 422 with a machine-readable reason code.

---

## Network Security

### Docker Bridge Network

All containers communicate over a private Docker bridge network:

- **Development**: Service ports 4001–4017, database ports 5441–5452, management ports are exposed to host for convenience
- **Production**: Only Nginx (:80 → 4000) and Frontend (:3000) should be exposed; all other ports blocked by firewall

### Inter-Service Communication

- **Synchronous (HTTP)**: Internal Docker service names (e.g., `http://claw-auth-service:4001`)
- **Asynchronous (RabbitMQ)**: Topic exchange, services subscribe to specific routing keys only
- No service directly accesses another service's database

### Workspace OAuth2 / PKCE Security

The workspace service implements OAuth2 with PKCE for external integrations:

- PKCE challenge generated and stored in Redis with a short TTL (10 minutes)
- State parameter validated on callback to prevent CSRF in OAuth flows
- OAuth tokens stored encrypted (AES-256-GCM) in `workspace_connectors` table
- Token refresh handled server-side; client never sees raw OAuth tokens

### Agent Terminal Command Security

The agent service requires explicit human approval for terminal commands:

- All commands queued as `PENDING` records before execution
- Frontend presents commands to the user for approve/reject
- Commands can be executed only after approval is recorded
- Commands with `APPROVED` status are logged with executor identity and timestamp
- Policy violation events are published to the audit log

---

## Input Validation

All incoming data validated with Zod schemas before reaching service logic:

- Every endpoint has a Zod schema for body, query params, and path params
- Custom NestJS pipe runs `z.safeParse()` before the handler executes
- Invalid requests → `400 Bad Request` with structured error details
- **Rule**: Every `z.string()` MUST have `.max()` — unbounded strings are a denial-of-service risk
- **Rule**: Every `z.array()` MUST have `.max()` — unbounded arrays are a denial-of-service risk
- Enums: domain values validated against TypeScript enums, never raw string comparisons
- UUIDs: all ID parameters validated as UUID format

---

## Rate Limiting

Rate limiting at two levels:

### 1. Nginx (request-level, pre-service)

- Configured per route group in `infra/nginx/nginx.conf`
- Returns 429 before the request reaches any microservice

### 2. NestJS `@nestjs/throttler` (per-service, per-user)

| Endpoint Category | Limit        | Window | Purpose                  |
| ----------------- | ------------ | ------ | ------------------------ |
| Authentication    | 5 requests   | 1 min  | Prevent brute-force      |
| Token refresh     | 10 requests  | 1 min  | Prevent token abuse      |
| Chat message send | 30 requests  | 1 min  | Prevent API cost abuse   |
| General API       | 100 requests | 1 min  | General abuse prevention |

- Rate-limit counters stored in Redis, keyed by user ID (authenticated) or IP (unauthenticated)
- Exceeded limits return `429 Too Many Requests` with `Retry-After` header
- SSE streaming endpoints use `@SkipThrottle()` — long-lived connections should not consume the rate-limit budget

---

## XSS Prevention

### Frontend

- React JSX automatically escapes all rendered values
- `dangerouslySetInnerHTML` is prohibited in the codebase (ESLint rule enforced)
- Chat message content rendered as plain text / markdown, not raw HTML
- Content Security Policy headers restrict script sources

### Backend

- All API responses use `Content-Type: application/json`
- HTML never generated or served by the API
- Structured logging (pino) with redaction for authorization, password, apiKey, token, secret fields

---

## CSRF Considerations

- JWT bearer token auth is inherently CSRF-resistant (browsers cannot auto-attach Authorization headers cross-origin)
- Cookies set with `SameSite=Strict` and `HttpOnly` flags where used for refresh tokens
- CORS configured on Nginx to allow only the frontend origin (not wildcard)
- OAuth2 state parameter validated on all workspace OAuth callbacks

---

## Helmet (Security Headers)

All 16 NestJS services apply `helmet` middleware:

- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Content-Security-Policy`

---

## Docker Security

- Each service and database runs in its own container with its own filesystem
- No containers run in privileged mode
- Official images used for all infrastructure (pgvector, redis, mongo, rabbitmq, ollama)
- Images pinned to major version tags
- `.env` file excluded from Docker contexts via `.dockerignore`
- Each database has its own named volume; no sensitive bind mounts from host

---

## Pino Log Redaction

Structured logs produced by all 16 services redact sensitive fields:

```json
{ "redact": ["req.headers.authorization", "password", "refreshToken", "apiKey", "token", "secret"] }
```

Log entries containing these fields have their values replaced with `[Redacted]`.

---

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email the maintainers at the address listed in the repository's security policy
3. Include: description, reproduction steps, potential impact, suggested fix (if known)
4. Acknowledgment within 48 hours; fix released as a patch before public disclosure

We follow coordinated disclosure practices and credit reporters in release notes.
