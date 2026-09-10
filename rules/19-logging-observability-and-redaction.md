# 19 — Logging, Observability, and Redaction

## Purpose

Every request is traceable end-to-end and no log line ever leaks a secret. Logs
are a first-class deliverable: the engineer reading Docker logs at 2 AM must be
able to follow a flow across services without guessing.

## Applies to

All backend `*.service.ts`, `*.manager.ts`, `*.adapter.ts`, `*.utility.ts`,
`*.repository.ts`; the frontend logger utility; the Pino → RabbitMQ `log.server`
→ `server-logs-service` pipeline.

## Mandatory rules

1. **NestJS `Logger` only** (`private readonly logger = new Logger(ClassName.name)`).
   Frontend uses the logger utility. No `console.log` (`console.warn`/`console.error`
   tolerated only for `main.ts` bootstrap).
2. **Per-public-method logging is mandatory:** `debug` on entry (non-PII inputs),
   `info` for side effects (DB write / HTTP call / RabbitMQ publish / file write),
   `warn` for retry/fallback/degraded paths, `error` in every `catch` before
   rethrow/fallback. A method with zero logs is a blocker.
3. **Never log secrets** — tokens, passwords, refresh tokens, API keys, encrypted
   config, or full request/response bodies that may contain them. Use `safeStringify`,
   not raw `JSON.stringify`, for untrusted objects.
4. **Extend the Pino redaction config, don't bypass it.** Redacted keys include
   `authorization`, `password`, `refreshToken`, `apiKey`, `token`, `secret` — add
   new sensitive keys there.
5. **Correlation IDs propagate.** `X-Request-ID` flows frontend → backend; background
   jobs emit a correlation ID; event payloads carry it (see [17](17-rabbitmq-events-and-jobs.md)).
6. **Structured fields, not string soup.** Log actor, entity type/id, action — the
   fields the `server-logs` viewer indexes.
7. **SSE routes skip request logging** (`@SkipLogging()`, autoLogging ignore) to
   avoid "Cannot set headers after sent."

## Prohibited patterns

- `console.log(...)` anywhere in production code.
- `this.logger.debug(JSON.stringify(user))` where `user` may hold a token/hash.
- A public method in a logic file with no log statements.
- Disabling redaction to "see the full body."

## Correct pattern

```ts
async syncModels(connectorId: string): Promise<SyncResult> {
  this.logger.debug(`syncModels: connectorId=${connectorId}`);
  try {
    const result = await this.provider.listModels(connectorId);
    this.logger.info(`syncModels: synced count=${result.length} connectorId=${connectorId}`);
    return result;
  } catch (error) {
    this.logger.error(`syncModels: failed connectorId=${connectorId} — ${(error as Error).message}`);
    throw error;
  }
}
```

## Client telemetry is network traffic, and is budgeted as such

Server logging is cheap: a line goes to a local transport. A browser log line
is an HTTP request, a rate-limit unit and a database write, so the same
generosity that is correct in a service is a defect in the client.

**Never send one request per log line.** The frontend logger buffers, collapses
and batches to `POST /client-logs/batch`. A five-second buffer that then loops
`post()` per entry is not batching — it is a burst generator, and it is exactly
what this codebase shipped until 2026-09-10 (92 requests, one per line).

**Never log inside a `queryFn`.** It fires on every mount, refetch, retry and
invalidation, so a single call site produces unbounded volume. This was 21% of
the client call sites and the majority of the traffic. Log in the mutation, in
the error boundary, or in the catch — somewhere that corresponds to one thing
happening once.

**Never log about the thing you are logging.** The client-logs admin page logged
inside the `queryFn` that reads client logs, so the table grew while it was
watched. The same trap one layer down: ingest endpoints must not emit a server
log line per received event, or a 20-event batch becomes 80 log lines.

**`logger.debug` does not reach production.** `CLIENT_LOG_MIN_TRANSPORT_LEVEL`
gates the network only; the in-memory store keeps every level for the developer
log view. If a line genuinely needs to be visible in production, make it
`logger.info` deliberately, at the call site.

**Telemetry must never be able to end a session.** The ingest route is listed in
`AUTH_REFRESH_EXEMPT_PATHS` and stays out of the 401 refresh flow. List the
exact route, never the prefix: matching is by substring, and `/client-logs`
would also exempt the admin READ routes, stranding an admin on the log page
behind a 401 that never retries. Best-effort
background traffic the user did not ask for must not hold the authority to
clear auth storage and redirect.

**The two batch ceilings must agree.** The client's
`CLIENT_LOG_MAX_BATCH_EVENTS` must stay at or below the service's
`CLIENT_LOG_BATCH_MAX_EVENTS`, or a large flush is rejected whole by the
schema's `.max()`.

Background: [ADR-089](../docs/13-adr/adr-089-client-telemetry-batch-endpoint.md) ·
[service guide](../docs/04-backend/service-guide-client-logs.md).

## Enforcement

- **ESLint** (`no-console`, `no-restricted-syntax`) — bans console methods.
- **Unit test / review checklist** — presence of entry+catch logging on public methods.
- **CI job** — logs flow to `claw_server_logs` (TTL 30d) via the existing pipeline.
- **Unit test** — `apps/claw-frontend/src/utilities/__tests__/logger-transport.utility.test.ts`
  proves the client sends one request for many entries, collapses repeats,
  splits at the ceiling and flushes on `pagehide`.
- **Unit test** — `apps/claw-frontend/src/utilities/__tests__/client-log-severity.utility.test.ts`
  proves `logger.debug` does not cross the network at an INFO floor, and that
  the comparison is by rank rather than by string order.
- **Unit test** — `apps/claw-frontend/src/lib/__tests__/http-client-refresh.test.ts`
  drives the real 401 interceptor: a telemetry write cannot end the session, an
  ordinary request still can, and the admin log READ routes still refresh.
- **Unit test** — `apps/claw-client-logs-service/src/modules/client-logs/dto/__tests__/client-logs.dto.spec.ts`
  pins the server-side batch ceiling.

## Related skills

- [04-debug-toolkit](../skills/04-debug-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Logging-coverage mindset", "Required logging signatures".

## Definition of done

- [ ] Every public method logs entry + catch (+ info/warn where applicable).
- [ ] No secret is loggable; redaction config extended for new sensitive keys.
- [ ] Correlation IDs propagate through HTTP + events + jobs.
- [ ] No new client log call site sits inside a `queryFn`.
- [ ] Any new client telemetry goes through `logger`, never a direct `post()`.
