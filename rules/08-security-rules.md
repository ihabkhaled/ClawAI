# ClawAI — Security Rules

> Security failures are production blockers, not minor issues. These rules prevent data leaks, auth bypass, injection, and denial of service.

---

## Authentication and Authorization

```
1. JWT access tokens: short-lived (default 15m), validated on every request
2. Refresh tokens: rotated on every use, stored as hash, invalidated on logout
3. Argon2 for password hashing (never bcrypt for new code)
4. RBAC: ADMIN / OPERATOR / VIEWER enforced via @Roles() decorator + RolesGuard
5. @Public() decorator required for unauthenticated routes (explicit opt-out)
6. NEVER pass JWT tokens in URL query parameters (they leak in logs, browser history)
7. SSE connections: use fetch() with Authorization header, NEVER EventSource API
8. Session binding: refresh tokens are user+session scoped, not global
```

---

## Secrets Management

```
1. NEVER log secrets, tokens, API keys, passwords, or encryption keys
2. Connector API keys stored as AES-256-GCM encrypted blobs in DB
3. NEVER return encrypted fields in API responses (strip in repository layer)
4. ENCRYPTION_KEY must be 64 hex characters (256-bit)
5. JWT_SECRET must be ≥ 32 characters of entropy
6. NEVER commit .env files (gitignored)
7. Pino log redaction configured for: authorization, password, refreshToken, apiKey, token, secret
```

---

## Input Validation

```
1. ALL input validated with Zod schemas before processing
2. Every z.string() MUST have .max() (default suggestion: 500 chars unless specified)
3. Every z.array() MUST have .max() (default suggestion: 100 items unless specified)
4. Validate at system boundaries: HTTP controllers and RabbitMQ consumers
5. NEVER trust data from RabbitMQ without validating it
6. File uploads: antivirus + magic byte + filename + zip-bomb checks (FileSecurityManager)
```

---

## Injection Prevention

```
1. Prisma ORM only — no raw SQL (prevents SQL injection)
2. No eval(), new Function(), or dynamic code execution
3. No dangerouslySetInnerHTML in React components
4. No child_process.exec() with user-controlled input
5. No template-based URLs with unsanitized user input
6. Filename sanitization: special chars → underscores before storage
```

---

## File Upload Security (FileSecurityManager)

Every file upload goes through 4 mandatory checks:

1. **Antivirus** — ClamAV Docker container. Graceful degradation if down (fail-safe: rejects)
2. **Magic Byte Validation** — File content must match declared MIME type
3. **Filename Validation** — No path traversal, null bytes, double extensions, dangerous extensions (.exe, .dll, .bat, .ps1, etc.)
4. **ZIP Bomb Detection** — Suspicious null byte patterns in archives

Failed checks → HTTP 422 with reason code. Never silently skip checks.

---

## Transport Security

```
1. Helmet security headers on ALL 11+ services (X-Frame-Options, CSP, HSTS, etc.)
2. CORS restricted to CORS_ORIGINS env var list
3. Rate limiting: @nestjs/throttler (100 req/min, configurable)
4. @SkipThrottle() required on SSE endpoints (long-lived connections don't rate-limit correctly)
5. X-Request-ID correlation header passed frontend → nginx → all backend services
```

---

## Sensitive Data Exposure

```
1. NEVER return passwordHash in any user API response
2. NEVER return encryptedConfig or encryptedTokens in connector API responses
3. Strip sensitive fields in repository response mapping (not in service layer)
4. Audit logs must record user + action + entity but NOT the entity's sensitive data
5. Usage ledger records resource metrics, NOT message content
```

---

## OWASP Top 10 Checklist

| Risk                          | Protection                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| A01 Broken Access Control     | RolesGuard + @Roles() + ownership checks in service layer          |
| A02 Cryptographic Failures    | AES-256-GCM for secrets, Argon2 for passwords, JWT rotation        |
| A03 Injection                 | Prisma ORM, Zod validation, no eval                                |
| A04 Insecure Design           | Auth on every endpoint, @Public() explicit opt-out                 |
| A05 Security Misconfiguration | Helmet, CORS restricted, rate limiting                             |
| A06 Vulnerable Components     | npm audit in CI, pinned base images                                |
| A07 Auth Failures             | Refresh token rotation, session invalidation, no URL tokens        |
| A08 Integrity Failures        | Conventional commits, signed packages                              |
| A09 Logging Failures          | Pino with redaction, structured logging, audit service             |
| A10 SSRF                      | Validate URLs in connector configs before making outbound requests |

---

## Security Checklist (per PR)

- [ ] No secrets hardcoded in any file
- [ ] No sensitive fields in API response shapes
- [ ] All new endpoints have auth guard (or explicit @Public())
- [ ] All new endpoints have role check (or explicit any-role)
- [ ] Zod validation on all new DTO inputs
- [ ] .max() on all string and array fields
- [ ] File upload endpoints use FileSecurityManager
- [ ] SSE endpoints have @SkipThrottle()
- [ ] No raw SQL introduced
- [ ] No eval() or dynamic code execution introduced
- [ ] Logs don't contain auth tokens or user secrets
