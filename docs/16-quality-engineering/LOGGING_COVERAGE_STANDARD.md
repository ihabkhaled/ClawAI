# Logging Coverage Standard

> Codified 2026-04-26 from the codebase-wide refactor (`.claude/Integrations/refactor__PLAN.md`).
>
> Every public method in every service, manager, adapter, utility, and repository MUST emit structured logs at the right severity. A method with zero log statements is a delivery blocker.

---

## Why This Standard Exists

The existing `OBSERVABILITY_AND_LOG_VERIFICATION_STANDARD.md` defines what to check per feature area. This standard defines what every method MUST emit so that the per-feature checks have something to verify against.

A typical bug investigation trail in ClawAI:

1. Open MongoDB Compass → `claw_server_logs` collection
2. Filter by `service = "<service-name>"` and time range
3. Filter by `level = "error"` and grep the message field
4. Trace the request id back through `level = "info"` and `level = "debug"` entries

**Without method-level logging at all four severities, step 4 fails. The investigation hits a wall.** This standard makes that wall impossible.

---

## What Counts as a "Public Method"

A "public method" is any method or function that:

- Is exported from a service / manager / adapter / utility / repository file
- Is a public method on a NestJS-injected class
- Is a top-level exported function

Private helpers within the same file are exempt — but if their failure should be observable, they should also log.

## Log Severity Mapping

| Severity       | When to use                                                                                        | Example log line                                                         |
| -------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `logger.debug` | Method entry, internal-state inspection, non-PII inputs                                            | `doX: input userId=abc threadId=def`                                     |
| `logger.info`  | Side-effecting operations: DB write, HTTP call, RabbitMQ publish, file write, external API success | `doX: persisted thread=abc messageId=xyz durationMs=42`                  |
| `logger.warn`  | Retries, fallbacks, degraded paths, rate-limit hits, partial success                               | `doX: primary provider failed, falling back to local-ollama (attempt 2)` |
| `logger.error` | Every `catch` block, BEFORE rethrow or fallback                                                    | `doX: failed — Error: <message>`                                         |

## Required Log Signatures

### Minimum viable logging on a public method

```ts
async doX(input: Input): Promise<Output> {
  this.logger.debug(`doX: input=${safeStringify(input)}`);
  try {
    const result = await this.somethingThatMightFail(input);
    this.logger.info(`doX: completed thingId=${result.id}`);
    return result;
  } catch (error) {
    this.logger.error(`doX: failed — ${(error as Error).message}`);
    throw error;
  }
}
```

### With retry + fallback

```ts
async doX(input: Input): Promise<Output> {
  this.logger.debug(`doX: input=${safeStringify(input)}`);
  try {
    return await this.primary(input);
  } catch (primaryError) {
    this.logger.warn(`doX: primary failed (${(primaryError as Error).message}), trying fallback`);
    try {
      const result = await this.fallback(input);
      this.logger.info(`doX: completed via fallback thingId=${result.id}`);
      return result;
    } catch (fallbackError) {
      this.logger.error(`doX: both primary and fallback failed — ${(fallbackError as Error).message}`);
      throw fallbackError;
    }
  }
}
```

### Repository method (returning data, never throwing)

```ts
async findByIdRepo(id: string): Promise<Entity | null> {
  this.logger.debug(`findByIdRepo: id=${id}`);
  const result = await this.prisma.entity.findUnique({ where: { id } });
  if (!result) {
    this.logger.debug(`findByIdRepo: not found id=${id}`);
  }
  return result;
}
```

### Adapter method (external HTTP)

```ts
async fetchFromProviderAdapter(query: string): Promise<ProviderResponse> {
  this.logger.debug(`fetchFromProviderAdapter: query length=${query.length}`);
  const startTime = Date.now();
  try {
    const response = await this.httpClient.get(this.url, { params: { q: query } });
    const durationMs = Date.now() - startTime;
    this.logger.info(`fetchFromProviderAdapter: ok status=${response.status} durationMs=${durationMs}`);
    return response.data;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    this.logger.error(`fetchFromProviderAdapter: failed durationMs=${durationMs} — ${(error as Error).message}`);
    throw error;
  }
}
```

## Banned Logging Practices

- **`console.log` / `console.debug` / `console.info` / `console.trace`** — use NestJS `Logger`. Banned by ESLint.
- **Logging full request/response bodies** without redaction — they may contain credentials.
- **Logging tokens, passwords, refresh tokens, API keys, authorization headers** — Pino redaction must catch these. If a new sensitive field is added, extend the redaction config.
- **Logging at the wrong severity** — every catch block uses `error` (not `warn`); side-effecting operations use `info` (not `debug`); pure entry inspections use `debug` (not `info`).
- **Empty `catch { }` blocks** — every catch logs. If you really mean "ignore", log `debug` with the reason.

## Pino Redaction Config

The Pino transport in every service has redaction enabled for these paths:

- `req.headers.authorization`
- `req.headers.cookie`
- `req.body.password`
- `req.body.refreshToken`
- `req.body.apiKey`
- `req.body.token`
- `*.password`
- `*.token`
- `*.apiKey`
- `*.refreshToken`
- `*.secret`
- `*.authorization`

If a new sensitive field is introduced (e.g. `clientSecret`), add it to the per-service Pino config in `src/app/main.ts` AND to the redaction list above.

## Where Logs Go

```
NestJS Logger → Pino transport → stdout
                              → RabbitMQ publish (claw.events / log.server)
                                ↓
                claw-server-logs-service consumer
                              ↓
                MongoDB (claw_server_logs collection, TTL 30 days)
```

Frontend logs go via `claw-client-logs-service` (HTTP batch endpoint).

Audit-grade events go to `claw-audit-service` (separate stream, MongoDB `claw_audit`, no TTL).

## Verification Checklist (per change)

After implementing or modifying any service/manager/adapter/utility/repository file:

- [ ] Every public method emits `logger.debug` on entry
- [ ] Every public method's `catch` block emits `logger.error` before rethrow
- [ ] Every side-effecting operation (DB write, HTTP call, RabbitMQ publish, file write) emits `logger.info`
- [ ] Every retry/fallback emits `logger.warn`
- [ ] No new `console.*` calls
- [ ] No new sensitive fields logged in plain text
- [ ] Pino redaction config covers any new sensitive field
- [ ] Manual sanity check: tail Docker logs and trigger the new code path; verify the expected log lines appear

## ESLint Enforcement

The root `eslint.config.mjs` and per-service configs ban `console.log/debug/info/trace` via `no-restricted-syntax` (rule promoted to error in Phase U of the codebase-wide refactor).

A future enhancement (tracked) is a custom AST rule `@claw/local/require-method-logging` that flags public methods missing `logger.debug` entry or `logger.error` in catch blocks. Until that lands, this is enforced by code review and the per-service refactor recipe (`rules/09-refactor-rules.md` R7).

## When to Skip This Standard

Never. There are no exceptions. The smallest method still needs `logger.debug` on entry — so when production breaks, you can find it.

The only legitimate exemption: pure synchronous helpers in `*.utility.ts` files that take primitives in and return primitives out (e.g. a `formatBytes(n: number): string` function). For these, logging adds noise without value. Document the exemption with a comment if a reviewer asks.
