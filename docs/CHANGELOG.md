# Changelog

All notable changes to the Claw project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Grew from 9 to 17 backend services** — added Client Logs (:4010), Server
  Logs (:4011), Image (:4012), File Generation (:4013), Workspace (:4014),
  Agent (:4015), Research (:4016), and Llamacpp (:4017) services.
- **5th shared package** `@claw/shared-utilities` (jwt, http-client, crypto,
  retry, safe-stringify, …). All 5 shared packages now have their own
  lint/test/build/typecheck and are first-class CI matrix entries.
- **13 PostgreSQL instances** (up from 6) for database-per-service isolation;
  pgvector on the memory DB. MongoDB now backs 3 log/audit databases.
- New navigation docs: build-system (tsgo), port-service-map, end-to-end
  data flow, and a runbooks index.

### Changed

- **TypeScript toolchain migrated to tsgo** (`@typescript/native-preview`) +
  `tsc-alias`, replacing `tsc` / `nest build` across all 17 services and 5
  shared packages (build, dev watch, typecheck).
- **Docker base image `node:26-alpine` → `node:26-bookworm-slim`** (glibc is
  required for the tsgo and llama.cpp release binaries).
- **CI** is now 4 jobs (lint / typecheck / test / build), each a ~23-entry
  matrix (17 services + frontend + 5 shared packages).
- **i18n expanded to 9 locales** (added Hindi `hi`).
- Repo root slimmed: docs relocated to `docs/`, community-health files to
  `.github/`; only `README.md`, `LICENSE`, and the AI-agent guides remain.

### Fixed

- Frontend vitest OOM eliminated at its root (an unstable `useTranslation`
  mock caused an infinite render loop); the `run-vitest.cjs` wrapper was
  removed and `test` is now plain `vitest run`.

---

## [0.2.0] - 2026-04-04

### Phase 2: Microservices Restructure

#### Added

- **9 independent microservices** replacing the monolith backend:
  - Auth service (:4001) -- users, sessions, JWT, roles
  - Chat service (:4002) -- threads, messages, streaming
  - Connector service (:4003) -- provider configs, model catalogs
  - Routing service (:4004) -- routing decisions, policies
  - Memory service (:4005) -- memory, context packs, embeddings
  - File service (:4006) -- file upload, chunking
  - Audit service (:4007) -- audit logs, usage ledger
  - Ollama service (:4008) -- local model proxy
  - Health service (:4009) -- aggregates health from all services
- **6 separate PostgreSQL instances** (ports 5441-5446) for database-per-service isolation
- **MongoDB** for audit log storage (replacing PostgreSQL for audit data)
- **RabbitMQ** for async inter-service communication via topic exchange (`claw.events`)
- **Nginx reverse proxy** as the API gateway routing frontend requests to appropriate services
- **4 shared packages** under `packages/`:
  - `@claw/shared-types` -- enums, types, event contracts
  - `@claw/shared-constants` -- ports, names, exchange config
  - `@claw/shared-rabbitmq` -- NestJS RabbitMQ module
  - `@claw/shared-auth` -- JWT guard and decorators
- **Memory service** for persistent memory, context packs, and vector embeddings
- **File service** for file upload, chunking, and indexing
- **ADR-004** documenting the microservices architecture decision

#### Changed

- Monolith backend split into 9 independent NestJS microservices
- Database architecture changed from single PostgreSQL to 6 PostgreSQL instances + 1 MongoDB
- Inter-service communication uses RabbitMQ (async) and HTTP (sync) instead of in-process calls
- Frontend API calls route through Nginx reverse proxy instead of directly to a single backend
- Docker Compose now manages 20 containers (up from 3)
- Redis role changed from BullMQ job broker to caching and Ollama service state

#### Removed

- Monolith `claw-backend` application (replaced by 9 microservices)
- BullMQ job queue (replaced by RabbitMQ for inter-service messaging)
- Single shared PostgreSQL database

---

## [0.1.0] - 2026-04-04

### Phase 1: Foundation

#### Added

- **Monorepo structure** using npm workspaces with `claw-frontend` and `claw-backend` apps
- **Docker Compose** infrastructure with PostgreSQL 16 (pgvector), Redis 7, and Ollama
- **Authentication system** with JWT access/refresh tokens, argon2 password hashing, and refresh token rotation
- **User management** with role-based access control (ADMIN and USER roles)
- **Connector system** for managing AI provider connections with AES-256-GCM encrypted secret storage
- **Routing engine** with local judge model for intelligent provider/model selection
- **Chat system** with threaded conversations and message history
- **Audit logging** for tracking routing decisions and system events
- **Health check** endpoints for liveness and readiness monitoring
- **Frontend application** built with Next.js 14, React 18, TanStack Query, Zustand, and Tailwind CSS
- **Backend application** built with NestJS 10, Prisma ORM, BullMQ, and pino structured logging
- **Zod-based validation** for all API request DTOs on both frontend and backend
- **Database migrations** and admin seed script
- **Development tooling**: ESLint, Prettier, TypeScript strict mode
- **Testing setup**: Jest (backend), Vitest (frontend), Playwright (E2E)
- **Architecture documentation**: README, INSTALL, ARCHITECTURE, SECURITY, TESTING, CONTRIBUTING guides
- **ADRs**: Monorepo decision, PostgreSQL selection, local model routing strategy
