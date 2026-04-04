# Claw Health Service - Development Rules

## Service Overview

This is a lightweight, stateless aggregator service that calls all other services' /health endpoints and returns an aggregated health status.

## Tech Details

- **Port**: 4009
- **Database**: NONE (stateless)
- **Dependencies**: Minimal (NestJS, axios, nestjs-pino, zod)

## Behavior

- Calls all 8 service health endpoints in parallel
- Returns aggregated status: healthy (all up), degraded (some down), unhealthy (all down)
- Individual service failures do not crash this service — they are reported as degraded

## All Standard Backend Rules Apply

See the root CLAUDE.md for the full set of architecture rules, naming conventions, and code quality requirements.

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
