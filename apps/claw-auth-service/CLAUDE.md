# Claw Auth Service - Development Rules

## Service Overview

This is the Auth microservice for the Claw platform. It owns all authentication, user management, and session handling.

## Ownership

- **Users**: CRUD operations, role management, status management
- **Sessions**: Refresh token storage, session lifecycle
- **Authentication**: Login, logout, JWT token issuance, token refresh

## Tech Details

- **Port**: 4001
- **Database**: PostgreSQL (`claw_auth`)
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Events Published

- `user.created` — when a new user is created
- `user.login` — when a user successfully logs in
- `user.logout` — when a user logs out

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
Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/hashing.utility.ts` wraps `argon2`, and services import `{ hashPassword, verifyPassword }` from the wrapper.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npm run migrate          # Run migrations (production)
npm run migrate:dev      # Create + run migration (dev)
npm run seed             # Seed admin user
npm run prisma:generate  # Regenerate Prisma client
```
