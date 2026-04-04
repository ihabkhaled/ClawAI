# Changelog

All notable changes to the Claw project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
