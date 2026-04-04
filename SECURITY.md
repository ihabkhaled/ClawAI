# Security

Security practices, mechanisms, and considerations for the Claw platform.

---

## Microservices Security Model

Claw's microservices architecture provides security through isolation:

- **Network isolation**: All services communicate over a Docker bridge network; only Nginx, the frontend, and management ports are exposed to the host
- **Database-per-service**: Each microservice has its own database instance; a compromise of one database does not expose another service's data
- **Independent authentication**: Every microservice validates JWTs independently using the `@claw/shared-auth` package
- **Async messaging security**: RabbitMQ connections use authenticated credentials; services only consume messages from their subscribed routing keys

---

## Secret Handling

### Encryption at Rest (AES-256-GCM)

All sensitive credentials (provider API keys, connector secrets) are encrypted before storage using AES-256-GCM:

- **Algorithm**: AES-256-GCM (authenticated encryption with associated data)
- **Key**: 32-byte key derived from the `ENCRYPTION_KEY` environment variable
- **IV**: A unique 12-byte initialization vector is generated for each encryption operation
- **Auth Tag**: A 16-byte authentication tag is stored alongside the ciphertext to detect tampering

The encrypted payload stored in the database consists of: `IV + AuthTag + Ciphertext`, base64-encoded.

### Key Management

- The `ENCRYPTION_KEY` is stored only in the environment, never in the database or source code
- Rotation requires re-encrypting all stored secrets with the new key (a migration script is provided)
- The key must be a 32-byte value represented as a 64-character hex string

### What Is Encrypted

| Data                    | Encrypted | Storage Location          | Service     |
|-------------------------|-----------|---------------------------|-------------|
| Provider API keys       | Yes       | `connectors` table        | Connector   |
| AWS secret access keys  | Yes       | `connectors` table        | Connector   |
| User passwords          | Hashed    | `users` table             | Auth        |
| JWT secrets             | N/A       | Environment only          | All         |
| Refresh tokens          | Hashed    | `refresh_tokens` table    | Auth        |

### Secret Handling Per Service

Each microservice only has access to the secrets it needs:

| Service    | Secrets Accessed                                    |
|------------|-----------------------------------------------------|
| Auth       | JWT_SECRET, password hashes                         |
| Chat       | JWT_SECRET (for validation only)                    |
| Connector  | JWT_SECRET, ENCRYPTION_KEY, provider API keys       |
| Routing    | JWT_SECRET                                          |
| Memory     | JWT_SECRET                                          |
| File       | JWT_SECRET                                          |
| Audit      | JWT_SECRET                                          |
| Ollama     | JWT_SECRET, OLLAMA_BASE_URL                         |
| Health     | No secrets (stateless aggregator)                   |

---

## Authentication

### Password Hashing

- **Algorithm**: argon2id
- **Why argon2id**: Memory-hard algorithm resistant to GPU and ASIC attacks; recommended by OWASP
- Passwords are never stored in plaintext or reversible encryption
- Argon2 parameters follow OWASP recommendations for server-side hashing
- Password operations are handled exclusively by the Auth service

### JWT (JSON Web Tokens)

- **Access tokens**: Short-lived (default 15 minutes), contain user ID and role
- **Refresh tokens**: Longer-lived (default 7 days), used to obtain new access tokens
- **Signing**: HMAC-SHA256 with the `JWT_SECRET` environment variable
- **Storage**: Access tokens are held in memory on the frontend; refresh tokens are stored in httpOnly cookies or secure storage
- **Validation**: Every microservice validates JWTs independently using the `@claw/shared-auth` JWT guard -- no single point of failure for auth validation

### Refresh Token Rotation

When a refresh token is used:
1. The Auth service verifies the token against the stored hash
2. The old token is invalidated immediately
3. A new access token and refresh token pair is issued
4. The new refresh token hash replaces the old one in the database

This limits the damage window if a refresh token is compromised -- it can only be used once.

### Session Invalidation

- Logging out invalidates all refresh tokens for the user
- Admin users can force-invalidate all sessions for any user
- Expired refresh tokens are periodically cleaned from the database

---

## Authorization

### Role-Based Access Control (RBAC)

Claw uses a simple role-based model with two roles:

| Role    | Capabilities                                                      |
|---------|-------------------------------------------------------------------|
| `ADMIN` | Full access: manage users, connectors, routing rules, view audits |
| `USER`  | Use chat, manage own threads, view own profile                    |

### Guard Implementation

Authorization is enforced using NestJS guards provided by `@claw/shared-auth`:

- **`JwtAuthGuard`**: Verifies the JWT is valid and attaches the user to the request
- **`RolesGuard`**: Checks that the authenticated user has the required role for the endpoint
- Guards are applied at the controller or individual route level using decorators
- All endpoints except `/auth/login`, `/auth/register`, and `/health` require authentication
- Each microservice applies these guards independently

### Resource Ownership

Beyond role checks, services enforce ownership:
- Users can only access their own chat threads and messages (Chat service)
- Users can only view and modify their own profile (Auth service)
- Connectors are shared resources managed by admins (Connector service)

---

## Network Security

### Docker Bridge Network

All microservices, databases, and infrastructure containers communicate over a private Docker bridge network:

- Only the following ports are exposed to the host:
  - Nginx (:80) -- API gateway
  - Frontend (:3000) -- UI
  - Individual service ports (:4001-4009) -- for development convenience
  - Database ports (:5441-5446, :27018, :6380) -- for development convenience
  - RabbitMQ management (:15672) -- for administration
- In production, only Nginx (:80) and Frontend (:3000) should be exposed to the host
- Services reference each other by Docker service name (e.g., `claw-auth-service`), not by IP
- Database containers are not accessible from outside the Docker network in production

### Inter-Service Communication

- **Synchronous (HTTP)**: Services call each other via internal Docker network URLs
- **Asynchronous (RabbitMQ)**: Events are published to the `claw.events` topic exchange; services subscribe to specific routing keys
- No service directly accesses another service's database

### RabbitMQ Authentication

- RabbitMQ requires authenticated connections (username/password)
- Default credentials (`guest`/`guest`) must be changed in production
- Each service authenticates to RabbitMQ independently
- Message integrity is maintained by the AMQP protocol over the Docker internal network

---

## Input Validation

### Zod DTOs

All incoming request data is validated using Zod schemas:

- Every endpoint defines a Zod schema for its request body, query parameters, and path parameters
- Validation is applied via a custom NestJS pipe that runs Zod `.parse()` before the handler executes
- Invalid requests receive a `400 Bad Request` with structured error details
- Zod schemas serve as the single source of truth for both validation and TypeScript types
- Shared types are defined in `@claw/shared-types` and used across services

### Validation Rules

- **String inputs**: Maximum length enforced, trimmed of whitespace
- **Email addresses**: Format validated with Zod's `.email()` refinement
- **Passwords**: Minimum length enforced (8 characters)
- **UUIDs**: All ID parameters validated as UUID format
- **Enums**: Domain values validated against TypeScript enums, never raw strings
- **Pagination**: Page and limit values validated as positive integers with upper bounds

---

## Rate Limiting

### Strategy

Rate limiting is applied at the Nginx reverse proxy level and within individual services:

| Endpoint Category     | Limit            | Window  | Purpose                          |
|-----------------------|------------------|---------|----------------------------------|
| Authentication        | 5 requests       | 1 min   | Prevent brute-force attacks      |
| Token refresh         | 10 requests      | 1 min   | Prevent token abuse              |
| Chat message send     | 30 requests      | 1 min   | Prevent API cost abuse           |
| General API           | 100 requests     | 1 min   | General abuse prevention         |

### Implementation

- Rate limits are enforced using Redis-backed counters
- Each limit is keyed by user ID (authenticated) or IP address (unauthenticated)
- Exceeded limits return `429 Too Many Requests` with a `Retry-After` header
- Nginx provides a first layer of rate limiting before requests reach services

---

## XSS Prevention

### Frontend

- React's JSX automatically escapes rendered values, preventing most XSS vectors
- `dangerouslySetInnerHTML` is never used in the codebase
- User-generated content (chat messages) is rendered as plain text, not HTML
- Content Security Policy (CSP) headers restrict script sources to same-origin

### Backend

- All API responses use `Content-Type: application/json`
- HTML content is never generated or served by the API
- User input is validated and sanitized before storage
- Structured logging (pino) prevents log injection

---

## CSRF Considerations

### Current Approach

- The API uses bearer token authentication (JWT in the `Authorization` header), which is inherently resistant to CSRF because browsers do not automatically attach custom headers to cross-origin requests
- Cookies, if used for refresh tokens, are set with `SameSite=Strict` and `HttpOnly` flags
- CORS is configured on Nginx to allow only the frontend origin

### CORS Configuration

- `Access-Control-Allow-Origin` is set to the frontend URL (not wildcard)
- `Access-Control-Allow-Credentials` is enabled only when cookie-based refresh tokens are used
- Preflight requests are handled by Nginx for all mutating methods

---

## Docker Security

### Container Isolation

- Each microservice runs in its own container with its own filesystem
- Each database runs in its own container, isolated from other databases
- Containers communicate over a Docker bridge network; only necessary ports are exposed to the host
- No containers run in privileged mode

### Image Security

- Official images are used for all infrastructure services (pgvector, redis, mongo, rabbitmq, ollama)
- Images are pinned to major version tags to balance stability and security updates
- No custom images pull from untrusted registries

### Volume Security

- Database volumes persist on the host filesystem under Docker's managed volume directory
- Each database has its own named volume
- No sensitive data is bind-mounted from the host
- The `.env` file is excluded from Docker contexts via `.dockerignore`

---

## Reporting Vulnerabilities

If you discover a security vulnerability in Claw, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainers at the address listed in the repository's security policy
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if you have one)
4. You will receive an acknowledgment within 48 hours
5. A fix will be developed and released as a patch before public disclosure

We follow coordinated disclosure practices. We will credit reporters in the release notes unless they prefer to remain anonymous.
