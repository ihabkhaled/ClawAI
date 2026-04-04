# Claw — Root Project Rules

## Project Overview
Claw is a local-first AI orchestration platform. Monorepo with npm workspaces.

## Workspace Layout
- `apps/claw-frontend/` — Next.js frontend (see its own CLAUDE.md)
- `apps/claw-backend/` — NestJS backend (see its own CLAUDE.md)
- `docs/` — Architecture docs, ADRs, module docs
- `infra/` — Docker, deployment configs
- `scripts/` — Dev/ops scripts

## Universal Rules (Apply Everywhere)
1. NEVER use `any` — use proper types or `unknown`
2. NEVER disable ESLint rules — fix the underlying issue
3. NEVER use string literal unions for domain concepts — use enums
4. NEVER compare business-domain values using raw strings — use enum comparisons
5. NEVER log secrets, tokens, API keys, passwords, or encrypted payloads
6. NEVER expose secrets to the frontend
7. NEVER allow missing explicit return types in app logic
8. NEVER build god-files — keep modules focused
9. Use `type` over `interface` unless declaration merging is needed
10. Use enums for all domain constants
11. Use explicit named functions
12. Keep functions focused and short
13. Extract utilities aggressively
14. Prefer predictable code over clever code

## Commands
- `npm run dev` — start both frontend and backend
- `npm run dev:frontend` — start frontend only
- `npm run dev:backend` — start backend only
- `npm run build` — build both apps
- `npm run lint` — lint both apps
- `npm run test` — test both apps
- `npm run docker:up` — start infrastructure (postgres, redis)
- `npm run docker:up:ai` — start infrastructure + ollama
- `npm run migrate:dev` — run prisma migrations (dev)
- `npm run seed` — seed database with admin user

## Quality Gates
Before any milestone is complete:
- `npm run lint` passes with 0 errors
- `npm run build` passes with 0 errors
- `npm run test` passes
- Documentation is updated
- Migrations/seed are current
