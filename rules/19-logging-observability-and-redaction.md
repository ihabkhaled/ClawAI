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

## Enforcement

- **ESLint** (`no-console`, `no-restricted-syntax`) — bans console methods.
- **Unit test / review checklist** — presence of entry+catch logging on public methods.
- **CI job** — logs flow to `claw_server_logs` (TTL 30d) via the existing pipeline.

## Related skills

- [04-debug-toolkit](../skills/04-debug-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Logging-coverage mindset", "Required logging signatures".

## Definition of done

- [ ] Every public method logs entry + catch (+ info/warn where applicable).
- [ ] No secret is loggable; redaction config extended for new sensitive keys.
- [ ] Correlation IDs propagate through HTTP + events + jobs.
