# 03 — Microservice Boundaries

## Purpose

Each ClawAI service owns its data and its process. Boundaries are what make 17
services independently deployable and independently reasoned about. Crossing a
boundary the wrong way (shared DB, sync coupling where async belongs) turns the
system back into a distributed monolith.

## Applies to

All 17 `apps/claw-*` services and the `nginx` routing layer.

## Mandatory rules

1. **Each service owns its data.** Most services own a PostgreSQL database via
   Prisma 7.8; `audit`, `client-logs`, and `server-logs` use MongoDB (Mongoose);
   `health` has no DB. A service reads/writes only its own database.
2. **Cross-service communication is HTTP or events, never shared tables.** Use an
   internal HTTP call for synchronous request/response; publish a RabbitMQ event
   on the `claw.events` topic exchange for async fan-out. DLQ + 3 retries apply.
3. **Address services by container name and canonical port** from
   `@claw/shared-constants`, e.g. `http://chat-service:4002`, never `localhost`.
4. **Public HTTP goes through nginx** at `api/v1/*` per `infra/nginx/nginx.conf`.
   Adding a public route means adding the upstream + location block there.
5. **A new service must be wired everywhere** it is referenced: shared-constants
   port+name, health aggregator, all compose files, nginx, CI matrix. See
   [15](15-configuration-and-environment.md) and [23](23-git-commits-hooks-and-release-gates.md).

## Prohibited patterns

- One service importing another service's Prisma client or connecting to its DB URL.
- Hardcoding `http://localhost:<port>` for an inter-service call.
- A new endpoint reachable publicly without a matching nginx location block.

## Correct pattern

```ts
// chat-service asking memory-service for a retrieval bundle — HTTP, own port const
import { MEMORY_SERVICE_PORT } from '@claw/shared-constants';
// baseUrl resolved from AppConfig: http://memory-service:4005
await this.memoryClient.retrieve(userId, threadId);
```

> Discoverability gap to know about: `client-logs` (4010) and `server-logs` (4011)
> have **no** `*_SERVICE_PORT` constant in `@claw/shared-constants` — their ports
> are env-only. Do not invent a constant; read the env value through AppConfig.

## Enforcement

- **Architecture test** — asserts no service imports another service's DB client.
- **Knowledge check** — `.ai/manifests/{services,ports,nginx-routes,rabbitmq-events}.json`
  are the source of truth; `knowledge:verify` flags drift.
- **Review checklist** — HTTP-vs-event choice is reviewed for coupling.

## Related skills

- [08-event-bus-toolkit](../skills/08-event-bus-toolkit.md)
- [02-service-scaffold](../skills/02-service-scaffold.md)

## Related context

- Root `CLAUDE.md` — "Architecture at a Glance", "Nginx Route Map".
- `.ai/manifests/services.json`, `.ai/manifests/event-graph.json`.

## Definition of done

- [ ] No cross-DB access introduced.
- [ ] Inter-service calls use container name + shared-constant port.
- [ ] Any new public route added to `infra/nginx/nginx.conf`.
- [ ] New service wired into every required manifest and infra file.
