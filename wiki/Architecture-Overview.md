# Architecture Overview

ClawAI is a microservice monorepo with a Next.js frontend, shared packages, service-owned persistence, Nginx reverse proxying, RabbitMQ asynchronous events, provider/workspace connectors and local inference runtimes.

## Invariants
1. Each service owns its data.
2. Cross-service access is HTTP or RabbitMQ, never another service's database.
3. Shared contracts/utilities live in `packages/`.
4. Nginx owns the public reverse-proxy surface.
5. `.ai/manifests/` are generated current facts.
6. Rules and architecture linting enforce boundaries.
7. Local/cloud model runtimes are routed through explicit services/adapters.

```text
Browser / Coding Agent / Agent CLI
              |
            Nginx
              |
      +-------+---------+
      |                 |
  Next.js UI       /api/v1/*
                        |
                  NestJS services
                 /       |        \
           owned DB   RabbitMQ   providers/local runtimes
```

Canonical sources: [context/architecture-map.md](https://github.com/ihabkhaled/ClawAI/blob/main/context/architecture-map.md) · [context/request-flow-map.md](https://github.com/ihabkhaled/ClawAI/blob/main/context/request-flow-map.md) · [context/event-flow-map.md](https://github.com/ihabkhaled/ClawAI/blob/main/context/event-flow-map.md) · [docs/03-architecture/](https://github.com/ihabkhaled/ClawAI/blob/main/docs/03-architecture).
