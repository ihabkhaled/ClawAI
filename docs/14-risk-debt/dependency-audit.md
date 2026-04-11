# Dependency Audit

## Overview

This document catalogs the major npm dependencies used across the ClawAI monorepo, their versions, licenses, and security considerations. The monorepo uses npm workspaces with a root `package.json` orchestrating 13 backend services, 1 frontend, and 4 shared packages.

Last updated: 2026-04-11

---

## Core Framework Dependencies

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| @nestjs/core | 10.4.x | MIT | All 13 backend services | NestJS core framework |
| @nestjs/common | 10.4.x | MIT | All 13 backend services | Common decorators, pipes, guards |
| @nestjs/platform-express | 10.4.x | MIT | All 13 backend services | Express HTTP adapter |
| next | 16.2.x | MIT | Frontend | React meta-framework |
| react | 19.2.x | MIT | Frontend | UI library |
| react-dom | 19.2.x | MIT | Frontend | React DOM renderer |
| typescript | 5.6+ | Apache-2.0 | All packages | Type-safe JavaScript |

---

## Database & ORM

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| @prisma/client | 5.22.x | Apache-2.0 | 9 PG services | PostgreSQL ORM |
| prisma | 5.22.x | Apache-2.0 | 9 PG services | Schema management, migrations |
| mongoose | Latest | MIT | audit, client-logs, server-logs | MongoDB ODM |
| ioredis | Latest | MIT | Services using Redis | Redis client |

---

## Authentication & Security

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| jsonwebtoken | Latest | MIT | auth-service, shared-auth | JWT signing and verification |
| argon2 | Latest | MIT | auth-service | Password hashing |
| helmet | Latest | MIT | All 13 backend services | Security headers |
| @nestjs/throttler | Latest | MIT | All 13 backend services | Rate limiting |

---

## Validation

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| zod | 3.24.x | MIT | All services | Runtime schema validation |

---

## Messaging & Events

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| amqplib | Latest | MIT | shared-rabbitmq | RabbitMQ client |

---

## Logging

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| nestjs-pino | Latest | MIT | All 13 backend services | Structured logging integration |
| pino | Latest | MIT | All 13 backend services | Fast JSON logger |
| pino-http | Latest | MIT | All 13 backend services | HTTP request logging |
| pino-pretty | Latest | MIT | All services (dev) | Dev log formatting |

---

## Frontend State & Data

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| @tanstack/react-query | 5.x | MIT | Frontend | Server state management |
| zustand | 4.x | MIT | Frontend | Client state management |

---

## Frontend UI

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| tailwindcss | 3.4.x | MIT | Frontend | Utility-first CSS |
| @radix-ui/* | Latest | MIT | Frontend | Accessible UI primitives |
| lucide-react | Latest | ISC | Frontend | Icon library |
| class-variance-authority | Latest | Apache-2.0 | Frontend | Component variant styling |
| clsx | Latest | MIT | Frontend | Conditional class names |
| tailwind-merge | Latest | MIT | Frontend | Tailwind class deduplication |

---

## Testing

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| jest | Latest | MIT | All 13 backend services | Backend test runner |
| @nestjs/testing | 10.4.x | MIT | All 13 backend services | NestJS test utilities |
| vitest | Latest | MIT | Frontend | Frontend test runner |
| @playwright/test | Latest | Apache-2.0 | E2E tests | Browser automation |

---

## Linting & Formatting

| Package | Version | License | Used By | Purpose |
| --- | --- | --- | --- | --- |
| eslint | 9.x | MIT | All packages | Code linting |
| prettier | 3.8.x | MIT | All packages | Code formatting |
| typescript-eslint | Latest | MIT | All packages | TypeScript ESLint rules |
| eslint-plugin-security | Latest | Apache-2.0 | Backend services | Security-focused lint rules |
| eslint-plugin-unicorn | Latest | MIT | Backend services | Best practice rules |
| eslint-plugin-import-x | Latest | MIT | All packages | Import ordering |
| eslint-plugin-react | Latest | MIT | Frontend | React lint rules |
| eslint-plugin-react-hooks | Latest | MIT | Frontend | Hook lint rules |
| eslint-plugin-jsx-a11y | Latest | MIT | Frontend | Accessibility rules |

---

## License Summary

| License | Count | Risk |
| --- | --- | --- |
| MIT | ~80% | None (permissive, commercial OK) |
| Apache-2.0 | ~15% | None (permissive, patent grant) |
| ISC | ~3% | None (equivalent to MIT) |
| Other | ~2% | Review individually |

All major dependencies use permissive licenses compatible with commercial and self-hosted deployment.

---

## Known Vulnerability Monitoring

### Current Status

Run `npm audit` to check for known vulnerabilities:

```bash
npm audit                    # Check all workspaces
npm audit --workspace=apps/claw-chat-service  # Check specific service
```

### Recommended Practices

1. **Weekly audit**: Run `npm audit` in CI and review results
2. **Dependabot/Renovate**: Enable automated dependency update PRs
3. **Pin versions**: Use `package-lock.json` for deterministic installs
4. **Update cadence**: Monthly dependency updates for non-breaking changes
5. **Major versions**: Evaluate carefully; test thoroughly before upgrading

---

## Supply Chain Security Considerations

| Risk | Mitigation |
| --- | --- |
| Dependency hijacking | Use `package-lock.json` for integrity verification |
| Typosquatting | Review new dependencies carefully before adding |
| Abandoned packages | Monitor for unmaintained critical dependencies |
| Excessive permissions | Avoid packages that require native code without justification |
| Transitive vulnerabilities | `npm audit` catches transitive dependency issues |

---

## Critical Dependencies

These packages are load-bearing and difficult to replace. Monitor closely:

| Package | Criticality | Replacement Options |
| --- | --- | --- |
| @nestjs/* | Very High | Express/Fastify (major rewrite) |
| prisma | Very High | TypeORM, Drizzle (migration effort) |
| next | Very High | Remix, Vite + React Router (rewrite) |
| react | Very High | None practical |
| zod | High | yup, joi (migration effort) |
| amqplib | High | rhea, rabbitmq-client |
| pino | Medium | winston, bunyan |
| tailwindcss | Medium | CSS modules, styled-components |
