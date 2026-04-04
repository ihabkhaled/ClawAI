# Claw — Root Project Rules

## Project Overview
Claw is a local-first AI orchestration platform using a **microservices architecture** with npm workspaces.

## Architecture
- **9 backend microservices** communicating via RabbitMQ (async) and HTTP (sync)
- **Nginx reverse proxy** as stateless router (port 80)
- **6 PostgreSQL instances** (one per relational service, fault-isolated)
- **1 MongoDB instance** for audit/telemetry
- **1 Redis instance** for caching, sessions, rate limiting
- **1 RabbitMQ instance** for async event bus
- **1 Ollama runtime** for local AI models

## Workspace Layout
```
claw/
├── apps/
│   ├── claw-frontend/            # Next.js (port 3000)
│   ├── claw-auth-service/        # NestJS (port 4001, PostgreSQL claw_auth)
│   ├── claw-chat-service/        # NestJS (port 4002, PostgreSQL claw_chat)
│   ├── claw-connector-service/   # NestJS (port 4003, PostgreSQL claw_connectors)
│   ├── claw-routing-service/     # NestJS (port 4004, PostgreSQL claw_routing)
│   ├── claw-memory-service/      # NestJS (port 4005, PostgreSQL claw_memory + pgvector)
│   ├── claw-file-service/        # NestJS (port 4006, PostgreSQL claw_files)
│   ├── claw-audit-service/       # NestJS (port 4007, MongoDB claw_audit)
│   ├── claw-ollama-service/      # NestJS (port 4008, no database)
│   └── claw-health-service/      # NestJS (port 4009, stateless aggregator)
├── packages/
│   ├── shared-types/             # Shared enums, types, event contracts
│   ├── shared-constants/         # Shared constants (ports, names, exchange)
│   ├── shared-rabbitmq/          # RabbitMQ NestJS module
│   └── shared-auth/              # JWT guard + decorators
├── infra/
│   └── nginx/nginx.conf          # Reverse proxy routing
├── docker-compose.yml            # Full infrastructure + all services
└── docs/
```

## Service Communication
- **Frontend → Services**: Via Nginx reverse proxy (path-based routing)
- **Service → Service (async)**: RabbitMQ topic exchange (claw.events)
- **Service → Service (sync)**: Direct HTTP calls between services
- **No single point of failure**: Nginx is stateless, RabbitMQ has durable queues

## Library Wrapping Rule
Every third-party library MUST be wrapped in a dedicated module/utility file (e.g., `src/common/utilities/<name>.utility.ts`). Components, hooks, services, and controllers NEVER import third-party libraries directly — they import the wrapper. If the library changes, only the wrapper file needs updating.

**Backend examples:**
- `src/common/utilities/hashing.utility.ts` wraps `argon2` — services import `{ hashPassword, verifyPassword }`
- `src/common/utilities/jwt.utility.ts` wraps `jsonwebtoken` — services import `{ signToken, verifyToken }`

**Frontend examples:**
- `src/services/shared/api-client.ts` wraps `fetch`
- `src/lib/utils.ts` wraps `clsx` + `tailwind-merge`

## Universal Rules (Apply Everywhere)
1. NEVER use `any` — use proper types or `unknown`
2. NEVER disable ESLint rules — fix the underlying issue
3. NEVER use string literal unions — use enums
4. NEVER compare domain values with raw strings — use enum comparisons
5. NEVER log secrets, tokens, API keys, passwords
6. NEVER expose secrets to the frontend
7. NEVER allow missing explicit return types
8. NEVER build god-files — keep modules focused
9. NEVER define types/interfaces/enums/constants inline in logic files — extract
10. NEVER put business logic in controllers
11. NEVER put Prisma/Mongoose calls outside repositories
12. NEVER cross database boundaries — use RabbitMQ or HTTP for inter-service data
13. Each service owns its data — no shared databases
14. Use `type` over `interface` unless declaration merging is needed

## Commands
```bash
docker compose up -d                    # Start all infrastructure + services
docker compose down                     # Stop everything
docker compose --profile local-ai up -d # Start with Ollama
docker compose ps                       # Check service status
docker compose logs -f auth-service     # Follow specific service logs
npm run lint                            # Lint all workspaces
npm run typecheck                       # TypeScript check all workspaces
npm run test                            # Test all workspaces
```

## Quality Gates
Before any milestone is complete:
- `npm run lint` passes with 0 errors across all services
- `npm run typecheck` passes with 0 errors
- All tests pass
- Documentation is updated
