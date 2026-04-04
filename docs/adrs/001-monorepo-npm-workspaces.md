# ADR-001: Monorepo with npm Workspaces

## Status
Accepted

## Context
Claw has a frontend (Next.js) and backend (NestJS) that share domain concepts (enums, types). We need a repository structure that supports shared code, unified tooling, and simple CI/CD.

## Decision
Use a monorepo with npm workspaces. Two workspace packages under `apps/`:
- `apps/claw-frontend` — Next.js
- `apps/claw-backend` — NestJS

## Consequences
- Single `npm install` at root installs all dependencies
- Shared scripts at root level for dev, build, lint, test
- Easy to add shared packages later under `packages/`
- No need for Turborepo/Nx initially — npm workspaces sufficient for two apps
