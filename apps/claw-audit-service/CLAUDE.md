# Claw Audit Service - Development Rules

## Service Overview

This is the Audit microservice for the Claw platform. It owns audit logs and usage ledger entries. Uses MongoDB via Mongoose (NOT Prisma).

## Ownership

- **Audit Logs**: Record and query audit trail entries
- **Usage Ledger**: Track resource usage across the platform

## Tech Details

- **Port**: 4007
- **Database**: MongoDB (`claw_audit`) via Mongoose
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Collections Owned

- `audit_logs`
- `usage_ledger`

## All Standard Backend Rules Apply

See the root CLAUDE.md for the full set of architecture rules, naming conventions, and code quality requirements. Key points:

- NEVER use `any` — use `unknown`, generics, or proper types
- NEVER disable ESLint rules
- NEVER use `console.log` — use NestJS Logger
- NEVER use `process.env` directly — use AppConfig (Zod-validated)
- Controllers are 3-line methods: extract params, call ONE service, return
- Service methods max 30 lines
- Repositories are pure data access only
- All Zod schemas must have `.max()` on every string and array field
- All errors use `BusinessException` with a `messageKey`
- Every function must have an explicit return type

## Library Wrapping Rule
Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/jwt.utility.ts` wraps `jsonwebtoken`, and services import `{ signToken, verifyToken }` from the wrapper.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
```
