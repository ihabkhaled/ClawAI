---
name: trace-request-end-to-end
summary: Trace an HTTP request across the stack — frontend repository → nginx :443 → controller → service → repository/manager → events/SSE.
task_keywords:
  [
    trace request,
    http flow,
    endpoint flow,
    controller,
    service,
    repository,
    manager,
    nginx,
    route,
    api call,
    request path,
    end to end,
    sse,
  ]
applies_to: [claw-frontend, all-backend-services, infra-nginx]
required_rules: [00-master-rules, 02-backend-rules]
required_context: [end-to-end-data-flow, system-architecture, services-index]
affected_workspaces: [none-read-only]
required_tests: [none-read-only]
required_docs: [none]
validation_lane: npm run knowledge:context -- --task="trace <route>" (read-only)
---

## When to use

You need to understand or debug how a specific HTTP endpoint behaves from the
button click to the database write: which frontend repository calls it, how
nginx routes it, which controller/service/repository/manager handle it, and what
events or SSE it emits. Use before modifying request/response shape or debugging
a 4xx/5xx.

## When NOT to use

For a purely async flow with no HTTP trigger, use
[`./trace-event-end-to-end.md`](./trace-event-end-to-end.md). For the frontend
half only (hooks/queries), use [`./trace-frontend-feature.md`](./trace-frontend-feature.md).
To just locate a file, use [`./navigate-codebase.md`](./navigate-codebase.md).

## Read first

- [`../docs/03-architecture/end-to-end-data-flow.md`](../docs/03-architecture/end-to-end-data-flow.md)
- [`../docs/03-architecture/system-architecture.md`](../docs/03-architecture/system-architecture.md)
- [`./01-codebase-navigation.md`](./01-codebase-navigation.md) — "Tracing a Feature End-to-End"

## Repository discovery steps

The canonical layers, in order: `apps/claw-frontend/src/repositories/<domain>/`
→ `infra/nginx/nginx.conf` (nginx :443 terminates TLS and proxies to the
service port) → `apps/claw-<name>-service/src/modules/<domain>/controllers/`
(3-line methods) → `services/` (≤30 lines/method, ownership + events) →
`repositories/` (no throw) and/or `managers/` (≤80 lines, orchestration,
adapters wrap vendor SDKs). Cross-service hops use `*_SERVICE_URL` (HTTP) or the
`claw.events` RabbitMQ exchange.

## Tests-first plan

Before concluding the trace is correct, reproduce it: hit the endpoint (through
nginx :443, then optionally direct to the service port) and confirm the
controller method you identified is the one that runs. Confirm the nginx
`location` block maps the path to the right upstream port. If SSE is involved,
confirm the route is excluded from autoLogging and has `proxy_buffering off`.

## Implementation steps

1. **Find the frontend caller:**
   ```bash
   grep -rn "apiClient\|fetch(" apps/claw-frontend/src/repositories --include="*.ts" | grep -i "<domain>"
   ```
2. **Find the nginx route:** open `infra/nginx/nginx.conf`, search the path
   prefix (e.g. `/api/v1/chat-messages`) → note the upstream service + port.
3. **Find the controller:**
   ```bash
   grep -rn "@Controller\|@Get\|@Post\|@Put\|@Patch\|@Delete" \
     apps/claw-<name>-service/src --include="*.controller.ts"
   ```
4. **Follow controller → service:** the 3-line method calls exactly one service
   method. Open it; note ownership checks and event publishes.
5. **Follow service → repository/manager:** repository = pure Prisma/Mongoose
   access; manager = external calls, adapters, SSE.
6. **Note side effects:** any `RabbitMQService.publish(...)` hands off to
   [`./trace-event-end-to-end.md`](./trace-event-end-to-end.md); any `@Sse`
   emits to connected clients.

## Security considerations

Confirm the endpoint is guarded (AuthGuard/RolesGuard/permission decorator) —
an unguarded mutating route is a finding. JWTs travel in the `Authorization`
header, never in URL query params (SSE included). Never log request bodies that
may carry tokens.

## Failure modes

- **Nginx longest-prefix surprise** — an SSE `location` must precede the generic
  service `location`; wrong order silently misroutes.
- **Direct-to-service works, via-nginx 404** — the nginx route is missing/stale.
- **Controller has logic** — that violates the 3-line rule; trace still valid
  but flag it per [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md).

## Validation commands

```bash
grep -rn "<path-prefix>" infra/nginx/nginx.conf
grep -rn "@Post('<subpath>')\|@Get('<subpath>')" apps/claw-<name>-service/src --include="*.controller.ts"
npm run knowledge:context -- --task="trace <route>" --route=<path>
```

## Documentation updates

None for tracing. A change to the route means updating
[`../docs/12-reference/api-reference.md`](../docs/12-reference/) and the service
guide.

## Definition of done

You can name every hop: FE repository file → nginx location/port → controller
method → service method → repository/manager → any event/SSE emitted, and you
reproduced the endpoint hitting the controller you identified.
