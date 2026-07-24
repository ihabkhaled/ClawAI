# 18 — Error Handling and Reliability

## Purpose

Errors are typed, logged, and surfaced — never swallowed, never left to spin. In
an async, multi-provider system the difference between a clean failure and a
frozen UI is whether an error record was stored. This rule codifies the hard-won
reliability lessons.

## Applies to

All backend services (exception filters, services, managers) and the frontend
poll/stream/mutation paths.

## Mandatory rules

1. **Typed domain errors.** Use `BusinessException(message, HttpStatus, code)` with
   a machine-readable `code`; `EntityNotFoundException` for not-found; forbidden →
   `BusinessException` with `HttpStatus.FORBIDDEN`.
2. **One error boundary.** The `GlobalExceptionFilter` renders errors; controllers
   never `try/catch`. The filter checks `response.headersSent` before writing (SSE safety).
3. **Never swallow.** Every `catch` logs before it rethrows or degrades — no empty
   `catch {}`, no discarding the error.
4. **Async/background failures store a record.** When all providers fail, the
   manager `emitError()` via SSE **then** `storeErrorMessage()` as an ASSISTANT row
   with `metadata: { error: true }`, both in nested `try/catch`. Without the stored
   record, frontend polling never terminates.
5. **Bounded retries/polling.** Retries and frontend polling have max limits
   (chat poll caps at ~90 polls / 3 minutes). No unbounded loops that flood the network.
6. **Poll hooks detect terminal error.** A poll hook stops when it sees
   `meta?.error === true`, not only on success.
7. **Fallback chains degrade explicitly** and log a `warn` at each fallback hop.

## Prohibited patterns

- `catch (e) {}` or `catch (e) { return null }` with no log.
- A background failure that emits SSE but stores no DB record (UI spins forever).
- An unbounded retry/poll loop with no ceiling.
- Throwing a plain `Error`/string for a domain condition instead of a typed exception.

## Correct pattern

```ts
// manager background path — SSE first, DB record second, both nested try/catch
try {
  return await this.run(ctx);
} catch (error) {
  try {
    this.emitError(ctx.threadId, error);
  } catch (e) {
    this.logger.error(`emitError failed: ${(e as Error).message}`);
  }
  try {
    await this.storeErrorMessage(ctx, error);
  } catch (e) {
    this.logger.error(`storeErrorMessage failed: ${(e as Error).message}`);
  }
  throw error;
}
```

## Enforcement

- **ESLint** — no-empty catch, no-floating-promises, controller no-try/catch.
- **Unit test** — every catch branch + the store-error path covered.
- **Review checklist** — bounded retries/polling and terminal-error detection verified.

## Related skills

- [04-debug-toolkit](../skills/04-debug-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Error Handling", "Known Gotchas: Fallback & Error Handling".

## Definition of done

- [ ] Domain errors typed with codes; single filter boundary.
- [ ] Background failures store a user-visible error record.
- [ ] Retries/polling bounded; poll hooks detect `meta.error`.
- [ ] No silent catch anywhere in the diff.
