# API Security Checklist

## Overview

This checklist covers security measures enforced across all 13 ClawAI backend services, mapped to OWASP Top 10 (2021) and common API security concerns.

---

## OWASP Top 10 Coverage

### A01: Broken Access Control

| Control | Implementation | Status |
| --- | --- | --- |
| Authentication on all endpoints | AuthGuard (global) with `@Public()` exceptions | Enforced |
| Role-based authorization | RolesGuard with `@Roles()` decorator | Enforced |
| Resource ownership validation | Service-layer userId checks | Enforced |
| No direct object references without auth | All entity access goes through user-scoped queries | Enforced |
| CORS restriction | `CORS_ORIGINS` environment variable, checked at Nginx and NestJS | Enforced |
| Method restrictions | Only defined HTTP methods are accepted per route | Enforced |

### A02: Cryptographic Failures

| Control | Implementation | Status |
| --- | --- | --- |
| Passwords hashed with argon2id | Memory-hard algorithm, not reversible | Enforced |
| API keys encrypted with AES-256-GCM | 256-bit key, random IV, auth tag | Enforced |
| JWT signed with HMAC-SHA256 | Secret key from environment variable | Enforced |
| No plaintext secrets in code | Environment variables only, Zod-validated | Enforced |
| HTTPS in production | Nginx TLS termination, HSTS header | Configured |
| No secrets in logs | Pino redaction for 7 field types | Enforced |

### A03: Injection

| Control | Implementation | Status |
| --- | --- | --- |
| SQL injection prevention | Prisma ORM (parameterized queries exclusively) | Enforced |
| NoSQL injection prevention | Mongoose schemas with typed queries | Enforced |
| Input validation | Zod schemas on all DTOs | Enforced |
| String length limits | `.max()` on all `z.string()` fields | Enforced |
| Array size limits | `.max()` on all `z.array()` fields | Enforced |
| No raw SQL/NoSQL queries | ESLint rule + Prisma-only data access in repositories | Enforced |
| No `eval()` or `new Function()` | ESLint `no-eval`, `no-implied-eval`, `no-new-func` | Enforced |

### A04: Insecure Design

| Control | Implementation | Status |
| --- | --- | --- |
| Layered architecture | Controller -> Service -> Repository separation | Enforced |
| Business logic in services only | Controllers are 3-line methods | Enforced |
| Fail-safe defaults | Fallback chains, graceful degradation | Enforced |
| Rate limiting | @nestjs/throttler on all services | Enforced |
| Input boundary validation | Zod schemas with min/max constraints | Enforced |

### A05: Security Misconfiguration

| Control | Implementation | Status |
| --- | --- | --- |
| Security headers | Helmet middleware on all services | Enforced |
| CORS properly configured | Allowlist-based origins | Enforced |
| Debug mode disabled in production | NODE_ENV check in AppConfig | Enforced |
| Default admin password change | Documented in onboarding | Recommended |
| Unnecessary features disabled | Minimal NestJS module imports | Enforced |

### A06: Vulnerable and Outdated Components

| Control | Implementation | Status |
| --- | --- | --- |
| Dependency management | npm workspaces, package-lock.json | Active |
| Regular updates | Manual update cycle | Needs automation |
| Known vulnerability scanning | `npm audit` available | Manual |
| Pinned versions | package-lock.json ensures reproducible installs | Enforced |

### A07: Identification and Authentication Failures

| Control | Implementation | Status |
| --- | --- | --- |
| Strong password hashing | argon2id (memory-hard) | Enforced |
| Brute-force protection | Rate limiting (10 req/min on login) | Enforced |
| Token rotation | Refresh tokens are single-use | Enforced |
| Short token lifetime | 15-minute access tokens (configurable) | Enforced |
| Session management | Database-tracked sessions with revocation | Enforced |

### A08: Software and Data Integrity Failures

| Control | Implementation | Status |
| --- | --- | --- |
| Pre-commit quality gates | Prettier + ESLint + TypeScript + Build + Test | Enforced |
| CI/CD pipeline | GitHub Actions (lint -> typecheck -> test -> build) | Enforced |
| Signed commits | Available but not enforced | Optional |
| Dependency integrity | package-lock.json checksum verification | Enforced |

### A09: Security Logging and Monitoring Failures

| Control | Implementation | Status |
| --- | --- | --- |
| Authentication events logged | user.login, user.logout audit events | Enforced |
| Authorization failures logged | 403 responses recorded | Enforced |
| Structured logging | Pino with service name, request ID, user ID | Enforced |
| Centralized log collection | server-logs-service aggregates all service logs | Enforced |
| Request correlation | X-Request-ID from frontend through all services | Enforced |
| Sensitive field redaction | 7 field patterns redacted automatically | Enforced |

### A10: Server-Side Request Forgery (SSRF)

| Control | Implementation | Status |
| --- | --- | --- |
| Internal service URLs configured | Environment variables, not user input | Enforced |
| Connector base URLs validated | Zod URL validation | Enforced |
| No user-controlled URL fetching | Users cannot specify arbitrary URLs | Enforced |
| Docker network isolation | Internal services not exposed to host | Enforced |

---

## Additional Security Controls

### Rate Limiting Configuration

| Endpoint | Limit | Rationale |
| --- | --- | --- |
| POST /auth/login | 10/min | Brute-force prevention |
| POST /auth/refresh | 20/min | Token refresh abuse |
| POST /chat-messages | 30/min | LLM cost control |
| POST /files/upload | 10/min | Storage abuse prevention |
| GET /health | 300/min | Monitoring needs higher limits |
| Default (all others) | 100/min | General protection |

### Security Headers (Helmet)

| Header | Value | Purpose |
| --- | --- | --- |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| Strict-Transport-Security | max-age=31536000 | Force HTTPS |
| Content-Security-Policy | Restrictive | Prevent XSS/injection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer leakage |
| X-DNS-Prefetch-Control | off | Prevent DNS prefetch leakage |

### Log Redaction Fields

All services automatically redact these fields from log output:
- `authorization` (JWT tokens in headers)
- `password` (user passwords)
- `refreshToken` (refresh tokens)
- `apiKey` (provider API keys)
- `token` (generic token fields)
- `secret` (generic secret fields)
- `encryptedConfig` (encrypted connector configs)

---

## Security Checklist for New Features

When adding any new feature, verify:

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
- [ ] New inter-service HTTP calls use configured internal URLs, not user input
- [ ] SSE endpoints use `@SkipLogging()` and `@SkipThrottle()`
