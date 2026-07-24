# 08 — Backend Managers and Use Cases

## Purpose

Managers hold complex orchestration that would bloat a service method: parallel
LLM calls, retry chains, external-API sequencing, multi-step assembly. They exist
so services stay ≤30-line coordinators and orchestration stays testable in isolation.

## Applies to

`apps/claw-*/src/**/*.manager.ts`.

## Mandatory rules

1. **Managers orchestrate; they do not own transport or persistence.** They call
   services/repositories and adapters, never handle HTTP requests directly.
2. **Method ceiling: ≤ 80 lines, cyclomatic complexity ≤ 15.** Over that, split
   into private helpers (each < 30 lines) with clear names
   (`buildPromptString()`, `fetchConnectorConfig()`, `parseResponse()`).
3. **File ceiling: 500 lines.** Beyond that, split into sub-managers.
4. **Fire-and-forget error path is mandatory.** Background work (e.g. all LLM
   providers fail) MUST `emitError()` via SSE first, then `storeErrorMessage()` in
   the DB, both in nested `try/catch`. Without the stored record the frontend
   polls forever.
5. **No inline declarations** — types/enums/consts extract to their files (see [12](12-types-enums-constants-and-declaration-ownership.md)).
6. **Every public method logs** debug on entry, info on side effects, warn on
   fallback/retry, error in every catch (see [19](19-logging-observability-and-redaction.md)).

## Prohibited patterns

- A manager method over 80 lines or complexity 15.
- Swallowing a background failure without both `emitError` and `storeErrorMessage`.
- A manager reading `@Req()`/`@Res()` or building HTTP responses.

## Correct pattern

```ts
// apps/claw-chat-service/src/modules/chat/managers/chat-execution.manager.ts
async execute(ctx: ExecutionContext): Promise<AssistantMessage> {
  try {
    return await this.runWithFallbackChain(ctx);   // ≤80 lines, delegates helpers
  } catch (error) {
    this.emitError(ctx.threadId, error);            // SSE first
    await this.storeErrorMessage(ctx, error);       // DB record second (nested try)
    throw error;
  }
}
```

## Enforcement

- **ESLint** (manager-file restrictions) — method-length/complexity ceilings,
  no inline declarations.
- **Unit test** — every `catch` branch and the fire-and-forget error path covered.
- **Review checklist** — orchestration boundary (manager vs service) confirmed.

## Related skills

- [08-event-bus-toolkit](../skills/08-event-bus-toolkit.md)
- [04-debug-toolkit](../skills/04-debug-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Manager Rules", "Phase 5: Error Handling in Async Flows".

## Definition of done

- [ ] All methods ≤ 80 lines / complexity ≤ 15; file ≤ 500 lines.
- [ ] Fire-and-forget paths emit SSE error then store a DB error record.
- [ ] Every catch branch is tested.
