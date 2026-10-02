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
3. Rate limiting: @nestjs/throttler (THROTTLE_LIMIT per THROTTLE_TTL, default 2500/60s),
   wired ONLY through buildThrottlerOptions() from @claw/shared-auth (see below)
4. @SkipThrottle() required on SSE endpoints (long-lived connections don't rate-limit correctly)
5. X-Request-ID correlation header passed frontend → nginx → all backend services
```

### Rate limiting: who a request is counted against

Every service calls `ThrottlerModule.forRoot(buildThrottlerOptions({ ttl, limit }))`
(`packages/shared-auth/src/throttle/`). Never pass a bare `[{ ttl, limit }]`: the
default tracker is `req.ip`, which behind nginx is nginx's docker address, so every
visitor on earth shared one budget (fixed 2026-10-02).

1. **A valid user access token → `user:<id>`**, wherever the user connects from.
   An invalid or expired token counts by address, like any anonymous call.
2. **Otherwise `X-Real-IP` → `ip:<addr>`**, and only when the socket peer IS
   nginx: loopback, the current docker address of the name `nginx`, or an
   address/CIDR in `TRUSTED_PROXY_ADDRESSES` (distributed nginx only). "Private
   peer" is not enough: a LAN client on a published port, or another container on
   claw-network, is private too. nginx OVERWRITES `X-Real-IP` with `$remote_addr`
   on every request, so a forged one never survives the edge. One implementation:
   `resolveClientAddress` in `@claw/shared-auth`, shared with the sign-in limiters
   (rules/58 item 3).
3. **Otherwise the socket peer → `peer:<addr>`**: a docker-network caller with no
   token gets its own bucket, and a direct hit on a published port is counted by its
   real source, not by the header it sent.
4. **`Authorization: Service <INTER_SERVICE_AUTH_TOKEN>` skips the global throttler**
   (constant-time compare). Internal calls must never 429 each other. A wrong token
   is counted like any other request.
5. **Never read `X-Forwarded-For`** for a limit key. nginx APPENDS to it, so its
   left-most entry is whatever the client typed.
6. **An nginx `location` that sets any `proxy_set_header` must restate `X-Real-IP`**
   (nginx drops every inherited header in that case). Pinned by
   `tools/__tests__/nginx-real-ip-restated.test.mjs`.

A published service port reached through Docker's userland proxy shows the docker
gateway as the peer, which is not nginx, so a forged `X-Real-IP` there is counted by
the gateway address, not believed. Production should still not expose service ports
to the internet; nginx is the only ingress. With the distributed nginx template and
`TRUSTED_PROXY_ADDRESSES` left blank, every visitor shares nginx's `peer:` bucket:
set it to nginx's egress IPs there.

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
- [ ] ThrottlerModule is wired with `buildThrottlerOptions()`; new nginx blocks that set headers restate `X-Real-IP`
- [ ] No raw SQL introduced
- [ ] No eval() or dynamic code execution introduced
- [ ] Logs don't contain auth tokens or user secrets

## Enforcement

- **CI job** — CodeQL (GitHub default setup) reports as the `Analyze` checks on
  every pull request.
- **ESLint** — the security and redaction rules in the flat config.
- **Unit test** — the per-service security and sanitizer suites.
- **Review checklist** — every change touching auth, permissions, file handling
  or user-supplied content gets an explicit security read.

## Definition of done

- [ ] No secret, token or credential is logged, returned or committed.
- [ ] User-supplied content is validated at the boundary and rendered inertly.
- [ ] Authorization is enforced server-side, not by hiding UI.
- [ ] CodeQL is clean for the change.
