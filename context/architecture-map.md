# Architecture Map (CANONICAL)

> Authority level 3 — below `CLAUDE.md` and `rules/00-non-negotiable-rules.md`,
> above everything else structural. This is the single source of truth for the
> **shape** of the system. Facts (ports/events/routes) are machine-readable in
> `.ai/manifests/*.json`; this file explains the topology and the rules that
> govern it. If a count here disagrees with a regenerated manifest, the manifest
> wins — fix this file.

## What ClawAI is

A **local-first AI orchestration platform**. It routes chat, image, file, and
research work across cloud AI providers and local runtimes (Ollama, llama.cpp,
ComfyUI, Stable Diffusion), with memory, context packs, workspace connectors,
and a desktop agent — all behind one authenticated gateway.

It is an **npm-workspace monorepo**: **17 NestJS microservices + 1 Next.js
frontend + 6 shared packages** = 24 workspaces (23 with a `package.json` under
`apps/`/`packages/`; the frontend counts as an app). See
[workspace-map.md](workspace-map.md).

## Layered topology

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (https://claw.local)                                          │
└──────────────────────────────────────────────────────────────────────┘
                │  HTTPS
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js frontend (claw-frontend, port 3000)                           │
│  page.tsx → controller hook → query/mutation hooks → repository → API  │
└──────────────────────────────────────────────────────────────────────┘
                │  /api/v1/*  (fetch, Bearer JWT)
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  nginx reverse proxy (TLS terminate; longest-prefix route to service)  │
└──────────────────────────────────────────────────────────────────────┘
                │  HTTP/HTTPS to service:port
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  17 NestJS services (ports 4001–4017)                                  │
│  Controller (3-line) → Service (≤30 ln) → Repository (no throw)        │
│                     ↘ Manager (≤80 ln orchestration)                   │
│                     ↘ Adapter (wraps vendor SDKs)                       │
└──────────────────────────────────────────────────────────────────────┘
       │                    │                       │
       ▼                    ▼                       ▼
┌─────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Per-service │   │ RabbitMQ topic exch. │   │ Direct HTTP between   │
│ database    │   │ `claw.events`        │   │ services (internal    │
│ (owned)     │   │ DLQ + 3 retries      │   │ endpoints)            │
└─────────────┘   └──────────────────────┘   └──────────────────────┘
```

Shared cross-cutting stores: **RabbitMQ** (event bus), **Redis** (caching),
and — for local AI — **Ollama**, **ComfyUI**, **Stable Diffusion** runtimes plus
**ClamAV** for upload scanning. See [service-catalog.md](service-catalog.md) and
`.ai/manifests/docker-services.json`.

## Services and ports (ground truth: `.ai/manifests/ports.json`)

15 services have a `*_SERVICE_PORT` constant in `@claw/shared-constants`. **Two
services (`client-logs` 4010, `server-logs` 4011) have NO port constant — their
port is env-only** (`CLIENT_LOGS_PORT` / `SERVER_LOGS_PORT`). This gap is called
out by the inventory audit (`portCoverageGaps`) and detailed in
[port-and-service-map.md](port-and-service-map.md).

| Service         | Port            | DB                             |
| --------------- | --------------- | ------------------------------ |
| auth            | 4001            | PostgreSQL                     |
| chat            | 4002            | PostgreSQL                     |
| connector       | 4003            | PostgreSQL                     |
| routing         | 4004            | PostgreSQL                     |
| memory          | 4005            | PostgreSQL                     |
| file            | 4006            | PostgreSQL                     |
| audit           | 4007            | MongoDB                        |
| ollama          | 4008            | PostgreSQL                     |
| health          | 4009            | none                           |
| client-logs     | 4010 (env-only) | MongoDB                        |
| server-logs     | 4011 (env-only) | MongoDB                        |
| image           | 4012            | PostgreSQL                     |
| file-generation | 4013            | PostgreSQL                     |
| workspace       | 4014            | PostgreSQL                     |
| agent           | 4015            | PostgreSQL                     |
| research        | 4016            | PostgreSQL                     |
| llamacpp        | 4017            | PostgreSQL (Debian base image) |

Most PostgreSQL services use **Prisma 7.8**; the three Mongo services (audit,
client-logs, server-logs) use **Mongoose**. `health` has no database.

## Request flow (frontend → service)

1. The browser hits the Next.js app; the app calls `/api/v1/*` with a Bearer
   JWT (never a token in the URL).
2. **nginx** terminates TLS and routes by **longest-prefix match** to the target
   service port. Route table is ground-truth in
   `.ai/manifests/nginx-routes.json`; e.g. `/api/v1/chat-threads` → chat:4002,
   `/api/v1/memories` → memory:4005, `/api/v1/agent` → agent:4015.
3. The service's **AuthGuard/RolesGuard** (from `@claw/shared-auth`) verifies the
   JWT and permissions, then the request flows Controller → Service →
   Repository/Manager.
4. Side effects fan out three ways: **write to the owned DB**, **publish a
   RabbitMQ event**, or **call another service's internal HTTP endpoint**.

Streaming (chat SSE) uses `@Sse('stream/:threadId')`; nginx must set
`proxy_buffering off` for those routes. Full paths in
[request-flow-map.md](request-flow-map.md).

## Event bus model

- **One topic exchange: `claw.events`** (durable), with a **DLQ and 3 retries
  with backoff**, provided by `@claw/shared-rabbitmq`.
- Event _patterns_ (routing keys, e.g. `message.routed`, `connector.synced`) and
  their `EventPattern` keys live in **`@claw/shared-types`** — the contract must
  be added there **first**.
- The generated **`.ai/manifests/event-graph.json`** lists every pattern with its
  producers and consumers (heuristic inference; treat as a strong hint, verify in
  code). `audit-service` is the near-universal consumer; `routing-service` and
  `chat-service` consume the message/connector/model lifecycle events.
- **`log.server`** is special: all 16 non-health services publish it; the
  `server-logs-service` persists it to MongoDB (TTL 30 days).

Rules for events: every producer needs a documented consumer; handlers must
never swallow errors silently. See [event-flow-map.md](event-flow-map.md).

## Data ownership (the hard boundary)

**Each service owns its database. No service ever reads or writes another
service's database.** Cross-service data flows only through:

- **HTTP** — internal endpoints (`/internal/*`) protected by a service token, or
- **RabbitMQ** — asynchronous events on `claw.events`.

This is a non-negotiable rule (`CLAUDE.md`, `rules/00-non-negotiable-rules.md`).
Which service owns which models is in
[database-ownership-map.md](database-ownership-map.md) and
`.ai/manifests/services.json` (`prismaModels` / `mongooseModels`).

## Backend layering rules

```
Controller → Service → Repository            (data access only)
                    ↘ Manager                (complex orchestration, external calls)
                          ↘ Adapter          (wraps a vendor SDK/API)
```

- **Controller** — 3-line methods: extract params, call ONE service method,
  return. No try/catch, no throw, no business logic, no DB access.
- **Service** — business logic; **≤30 lines per method**; owns
  ownership/permission validation and event publishing.
- **Manager** — orchestration only (multiple calls, retries, external APIs);
  **≤80 lines per method**, complexity ≤15.
- **Repository** — pure data access; **never throws** (returns data or null).
- **Adapter** — the only place a third-party SDK is imported.

Full rules in [backend-architecture.md](backend-architecture.md) and
`rules/02-backend-rules.md`. Declaration placement (no inline
types/enums/consts) is in
[declaration-ownership-map.md](declaration-ownership-map.md).

## Frontend layering rules

```
page.tsx (render only) → controller hook (useX) → query/mutation hooks
                                              → repository → /api/v1/*
```

- **Pages** render composition only, one controller hook, and must handle
  loading/empty/error/success states.
- **TanStack Query** owns all server state; **Zustand** holds minimal client
  state (auth, sidebar, filters).
- **shadcn/ui** for all form controls; **i18n across 13 locales** (en, ar, de,
  es, fr, hi, it, pt, ru, ja, th, fa, zh; ar and fa are RTL) — no hardcoded
  user-facing text.

Full rules in [frontend-architecture.md](frontend-architecture.md) and
`rules/03-frontend-rules.md`.

## Shared packages (the seams)

Six packages under `packages/` carry everything cross-service. The rule:
**types → `@claw/shared-types`, values → `@claw/shared-constants`, functions →
`@claw/shared-utilities`**, plus `@claw/shared-auth` (guards/decorators),
`@claw/shared-rabbitmq` (event bus module), `@claw/shared-entitlements` (plan
gates). Internal dependency edges are in
`.ai/manifests/workspace-dependency-graph.json`. See
[package-boundaries.md](package-boundaries.md).

## Toolchain (pointer)

Build is **tsgo + tsc-alias** (not `tsc`/`nest build`); tests are **jest**
(backend) / **vitest** (frontend) / **playwright** (E2E); docker is orchestrated
by **`scripts/claw.sh`**. Exact commands are canonical in
[stack-and-toolchain.md](stack-and-toolchain.md).

## Machine-readable sources for this map

| Concern                            | Manifest                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| Services, ports, DBs, models, deps | `.ai/manifests/services.json`, `ports.json`              |
| Events (producers/consumers)       | `.ai/manifests/event-graph.json`, `rabbitmq-events.json` |
| HTTP routes at the gateway         | `.ai/manifests/nginx-routes.json`                        |
| API endpoints per service          | `.ai/manifests/api-endpoints.json`                       |
| Frontend pages (89)                | `.ai/manifests/frontend-routes.json`                     |
| Docker service → compose files     | `.ai/manifests/docker-services.json`                     |
| Package dependency edges           | `.ai/manifests/workspace-dependency-graph.json`          |
| Permissions (38)                   | `.ai/manifests/permissions.json`                         |
| Env vars (274)                     | `.ai/manifests/environment-variables.json`               |
