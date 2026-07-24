---
name: create-manager-or-use-case
summary: Write a Manager for complex orchestration and external calls — ≤80 lines/method, complexity ≤15.
task_keywords:
  [
    manager,
    orchestration,
    external api call,
    retry,
    parallel calls,
    use case,
    adapter orchestration,
    fire and forget,
    80 lines,
    complexity 15,
    fallback chain,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>/managers]
required_rules: [02-backend-rules, 08-security-rules, 04-testing-rules]
required_context: [ai-context-pack, event-bus]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [unit (jest *.spec.ts) incl. every catch/error branch]
required_docs: [docs/04-backend/service-guide-<service>.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Manager / Use Case

A Manager owns complex orchestration the service is too thin for: multiple repository/service calls, external API adapters, retries, fallback chains, and parallel work. Methods stay within 80 lines / complexity 15; private helpers stay under 30 lines.

## When to use

- Chaining multiple external calls (LLM providers, connector adapters) with retries or fallback.
- Fire-and-forget background work that must emit SSE errors AND store an error record.
- Any orchestration a 30-line service method cannot cleanly hold.

## When NOT to use

- Single-operation persistence → repository.
- Simple ownership-checked CRUD → service.
- Wrapping one vendor SDK → that is an adapter ([`./add-library-adapter.md`](./add-library-adapter.md)); the manager calls the adapter.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — Manager Rules + Method-Size Discipline.
- [`../docs/04-backend/manager-layer-patterns.md`](../docs/04-backend/manager-layer-patterns.md) if present, else a sibling `*.manager.ts`.

## Repository discovery steps

1. Read a sibling `*.manager.ts` (e.g. chat-service execution/parallel managers) for the orchestration + error pattern.
2. Identify the adapters/services this manager will call and confirm their interfaces.
3. Check how the service invokes the manager and where events are published.

## Tests-first plan

- Cover the happy path, each fallback branch, and EVERY `catch` branch (mock a dependency throwing).
- For fire-and-forget paths, assert `emitError()` runs BEFORE `storeErrorMessage()` and both are in a nested try-catch.

## Implementation steps

1. Create `managers/<name>.manager.ts`; inject the adapters/services/repositories it orchestrates; add a logger.
2. Split each public method into named private helpers (`fetchConnectorConfig()`, `buildPromptString()`, `parseResponse()`), each <30 lines.
3. Implement retry/fallback explicitly; log `warn` on each fallback and `error` in each catch before rethrow or degrade.
4. For background work: on failure emit the SSE error first, then store an ASSISTANT error record with `metadata: { error: true }`, both wrapped in nested try-catch (so polling stops).
5. Extract inline types/enums/consts per the no-inline rule.
6. Keep the file under 500 lines; split into sub-managers if it grows.

## Security considerations

- Never log provider API keys, tokens, or full request/response bodies; use redaction-safe stringify.
- Validate external URLs before outbound requests (SSRF, OWASP A10).
- Managers never handle HTTP request/response objects directly.

## Failure modes

- Swallowing a provider failure without storing an error record → frontend "AI is thinking…" spins forever.
- Method over 80 lines / complexity 15 → ESLint failure; split it.
- Emitting the error record before the SSE event → frontend reacts late.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Describe the orchestration + fallback chain in `docs/04-backend/service-guide-<service>.md`.

## Definition of done

- ≤80-line methods, helpers <30 lines, every catch branch tested, background error path (SSE then DB) verified, gates green.
