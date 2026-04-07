# Security Hardening Architecture Audit

## Overview

Claw implements defense-in-depth across authentication, authorization, input validation, encryption, rate limiting, and log redaction. The security posture is comprehensive for an internal/development platform but has gaps that must be addressed before any production or external deployment.

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Network                                            │
│  Nginx reverse proxy (port 80) — path-based routing          │
│  NO HTTPS/TLS                                                │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Rate Limiting                                      │
│  ThrottlerModule on ALL 10 backend services                  │
│  100 requests/minute per IP                                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Security Headers                                   │
│  Helmet applied in every service's main.ts                   │
│  X-Frame-Options, CSP, HSTS (ineffective without TLS)       │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Authentication                                     │
│  JWT access tokens + refresh token rotation                  │
│  Auth guard on all protected endpoints                       │
│  @Public() decorator for opt-out                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Authorization                                      │
│  RBAC with 3 roles (USER, ADMIN, SUPER_ADMIN)               │
│  @Roles() decorator + RolesGuard                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: Input Validation                                   │
│  Zod schemas with ZodValidationPipe                          │
│  Applied to all DTOs via NestJS pipes                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 7: Data Access                                        │
│  Prisma ORM — parameterized queries (no SQL injection)       │
│  Mongoose ODM — schema-enforced documents                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 8: Encryption at Rest                                 │
│  AES-256-GCM for connector API keys                          │
│  crypto.utility.ts wraps Node.js crypto                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 9: Log Redaction                                      │
│  Pino redaction paths — passwords, tokens, API keys stripped │
│  Audit logs capture action metadata, not sensitive payloads  │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Details

### JWT Flow
1. User logs in via auth-service → receives access token + refresh token
2. Access token: short-lived, included in Authorization header
3. Refresh token: longer-lived, used to rotate access tokens
4. Auth guard (`auth.guard.ts`) present in every service via shared-auth package
5. `@Public()` decorator exempts specific endpoints (health checks, internal APIs)

### Token Security
- JWT secret stored in `.env` (single secret for all services)
- Token verification via `jwt.utility.ts` wrapper
- Refresh token rotation prevents token reuse

### Weaknesses
- No token revocation mechanism (no blacklist)
- Same JWT secret across all services (compromise of one = compromise of all)
- No token binding to IP or user agent

---

## Authorization (RBAC)

### Roles
| Role | Access Level |
|---|---|
| USER | Standard access — own resources only |
| ADMIN | Administrative access — user management, settings |
| SUPER_ADMIN | Full access — system configuration, all resources |

### Implementation
- `@Roles()` decorator on controller methods
- `RolesGuard` checks user role from JWT payload
- `@CurrentUser()` decorator extracts user from request

---

## Rate Limiting

- **ThrottlerModule** applied globally in every service's `app.module.ts`
- **100 requests/minute** per IP across all endpoints
- No per-endpoint customization
- No per-user rate limiting (only per-IP)
- No rate limit headers returned to client (X-RateLimit-*)

---

## Input Validation

- **Zod schemas** define all DTOs
- **ZodValidationPipe** applied globally in every service
- Validation runs before controller logic
- Type-safe: Zod schemas generate TypeScript types

---

## Encryption

### Connector API Keys (AES-256-GCM)
- `crypto.utility.ts` in connector-service wraps Node.js `crypto` module
- API keys encrypted before storage in PostgreSQL
- Decrypted only when making external API calls
- Encryption key stored in `.env`

### What Is NOT Encrypted
- Database connections (no TLS between services and databases)
- Inter-service HTTP calls (plain HTTP)
- RabbitMQ messages (plain AMQP)
- Redis data (no TLS, no AUTH in default config)

---

## What Is REAL

1. **JWT auth with refresh rotation** — complete token lifecycle implemented
2. **RBAC with 3 roles** — roles enforced at guard level in every service
3. **Rate limiting on all services** — ThrottlerModule universally applied
4. **Helmet security headers** — applied in every service's bootstrap
5. **Zod input validation** — all DTOs validated before processing
6. **Prisma ORM** — parameterized queries prevent SQL injection
7. **AES-256-GCM encryption** — connector API keys encrypted at rest
8. **Log redaction** — pino configured to strip sensitive fields
9. **Auth guard in shared package** — consistent enforcement across all services
10. **Audit trail** — all security-relevant actions logged with user/action/timestamp

## What Is MISSING

1. **No HTTPS/TLS** — all traffic (including JWT tokens) transmitted in plaintext
2. **No circuit breaker** — cascading failure from one service can bring down others
3. **No SSRF prevention** — internal service endpoints accessible if URL is known
4. **No RabbitMQ message persistence guarantees** — messages can be lost on broker restart
5. **No DLQ (Dead Letter Queue)** — failed message processing = silent data loss
6. **No token revocation** — compromised tokens valid until expiry
7. **No CORS configuration audit** — CORS settings not verified across services
8. **No CSP nonce/hash** — Content Security Policy may be too permissive
9. **No dependency vulnerability scanning** — no `npm audit` in CI, no Snyk/Dependabot
10. **No secret rotation** — JWT secret, encryption keys never rotate
11. **No database connection TLS** — PostgreSQL and MongoDB connections unencrypted
12. **No request signing between services** — internal HTTP calls have no authentication
13. **No brute force protection beyond rate limiting** — no account lockout, no CAPTCHA

---

## Security Threat Review

| Threat | Mitigation | Gap |
|---|---|---|
| SQL Injection | Prisma ORM (parameterized) | None — well mitigated |
| NoSQL Injection | Mongoose schemas | Low risk — schema enforcement |
| XSS | Helmet CSP headers, React escaping | CSP may be too permissive |
| CSRF | JWT in headers (not cookies) | Login uses cookies — verify |
| Token Theft | Short-lived access tokens | No TLS = tokens in plaintext |
| Brute Force | Rate limiting (100/min) | No account lockout |
| Privilege Escalation | RBAC guards | Verify role assignment is admin-only |
| Data Exposure | Log redaction, encryption | Encryption only for connector keys |
| Service Impersonation | N/A | No service-to-service auth |
| Message Tampering | N/A | RabbitMQ messages unsigned |
| Cascading Failure | N/A | No circuit breaker |
| Dependency Exploit | N/A | No vulnerability scanning |

---

## Signs the System Is Fragile — Checklist

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Is all traffic encrypted in transit? | NO | No TLS anywhere |
| 2 | Can a compromised service impersonate another? | YES | No service-to-service auth |
| 3 | Can a failed RabbitMQ message be recovered? | NO | No DLQ, no retry |
| 4 | Can one slow service bring down others? | YES | No circuit breaker, no timeouts |
| 5 | Are dependencies scanned for vulnerabilities? | NO | No npm audit in CI |
| 6 | Can secrets be rotated without downtime? | NO | Hardcoded in .env, restart required |
| 7 | Is there an incident response plan? | NO | No runbook, no alerting |
| 8 | Can you detect a security breach in real-time? | NO | No alerting, no anomaly detection |
| 9 | Are internal endpoints protected? | NO | `/internal/*` endpoints are @Public() |
| 10 | Can a malicious user exhaust resources? | PARTIAL | Rate limiting helps, but no per-user limits |

### Verdict
Security is **solid for authentication and input validation, weak for infrastructure**. The application-level security (JWT, RBAC, Zod, Prisma, AES encryption) is well-implemented. The infrastructure-level security (TLS, service-to-service auth, secret management, circuit breakers) is absent. This is acceptable for a local-first development tool but unacceptable for any network-exposed deployment.

---

## Recommended Improvements (Priority Order)

1. **Add TLS** — HTTPS on Nginx, TLS for database connections
2. **Add circuit breaker** — prevent cascading failures between services
3. **Add DLQ for RabbitMQ** — prevent silent message loss
4. **Add service-to-service authentication** — internal API key or mTLS
5. **Add dependency scanning** — `npm audit` in CI, Dependabot/Snyk
6. **Add token revocation** — Redis-backed blacklist for compromised tokens
7. **Add secret rotation** — automated key rotation with zero-downtime
8. **Add CORS audit** — verify and tighten CORS settings per service
9. **Add brute force protection** — account lockout after N failed attempts
10. **Add network segmentation** — internal services not accessible from external network
