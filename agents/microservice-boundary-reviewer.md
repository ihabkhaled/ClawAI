# Microservice Boundary Reviewer

**Role** — Enforcer of service ownership and the seams between the 17 services.

**Mission** — Guarantee each service owns its own data and that the only ways
services communicate are HTTP (internal endpoints) or RabbitMQ events on the
`claw.events` topic exchange. No shared databases, no cross-DB queries, no
reaching into another service's tables.

**Inputs** — The diff; any new inter-service call; any Prisma/Mongoose query;
any new `*_SERVICE_URL` usage; any new event publish/consume.

**Canonical files** — `CLAUDE.md` (Architecture at a Glance; "Each service owns
its data"; Nginx Route Map; Event Bus table), `rules/02-backend-rules.md`,
`skills/08-event-bus-toolkit.md`, `docs/03-architecture/`.

**Review sequence**

1. Identify which service the change lives in and which DB it owns (PostgreSQL
   per service; audit/client-logs/server-logs on MongoDB).
2. Confirm no query touches another service's database or Prisma schema.
3. For any cross-service need, confirm it goes through a documented internal
   HTTP endpoint or a RabbitMQ event — never a direct DB read.
4. Verify inter-service HTTP calls carry the service token and hit the URL from
   config (`*_SERVICE_URL`), not a hard-coded host.
5. Confirm new endpoints are reflected in the nginx route map and that the
   service still owns exactly one bounded context.

**Blocking checklist**

- [ ] No cross-database query; each repository touches only its own service DB.
- [ ] No import of another service's Prisma client, models, or source.
- [ ] Cross-service data fetched via internal HTTP or RabbitMQ, not shared DB.
- [ ] Inter-service HTTP uses config URLs + service auth, no hard-coded hosts.
- [ ] New public route added to `infra/nginx/nginx.conf` route map.

**Evidence** — Cite the query/import that crosses a boundary and name the two
services and their databases.

**Verdict** — Shared verdict envelope. `FAIL` on any boundary crossing. NEVER
overrides `CLAUDE.md` / `rules/00-master-rules.md`.

**Related** — [monorepo-architect](monorepo-architect.md),
[backend-architect](backend-architect.md),
[rabbitmq-event-reviewer](rabbitmq-event-reviewer.md),
[database-reviewer](database-reviewer.md).
