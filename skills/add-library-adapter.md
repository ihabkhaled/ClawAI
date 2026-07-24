---
name: add-library-adapter
summary: Wrap a vendor SDK or third-party library in an adapter/utility so services never import it directly.
task_keywords:
  [
    library wrapping,
    adapter,
    wrap sdk,
    third party library,
    vendor sdk,
    common utilities wrapper,
    no direct import,
    isolate dependency,
  ]
applies_to:
  [
    backend,
    apps/claw-<service>-service/src/common/utilities,
    apps/claw-<service>-service/src/modules/<domain>/managers/adapters,
  ]
required_rules: [02-backend-rules, 08-security-rules]
required_context: [ai-context-pack]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [unit (jest *.spec.ts) with the SDK mocked at the wrapper boundary]
required_docs: [docs/04-backend/adapters-reference.md, service CLAUDE.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a Library Adapter / Wrapper

Every third-party package MUST be wrapped once, so if the library changes only the wrapper changes. Services and controllers import the wrapper, never the package from `node_modules`.

## When to use

- Introducing a new npm package (HTTP SDK, PDF renderer, diffusion client, etc.) into a service.
- Isolating a vendor SDK behind a stable internal interface (an adapter).

## When NOT to use

- The library is already wrapped (`jsonwebtoken`→`jwt.utility.ts`, `argon2`→`password.utility.ts`, `ioredis`→`redis.utility.ts`, `amqplib`→shared-rabbitmq, fetch→`http.utility.ts`) — reuse it.
- The utility is cross-service → put it in `packages/shared-utilities/` instead of a per-service copy.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — Library Wrapping Rule + already-wrapped list.
- [`../docs/04-backend/adapters-reference.md`](../docs/04-backend/adapters-reference.md) if present, else a sibling adapter.

## Repository discovery steps

1. Search `packages/shared-utilities/` first — if the wrapper exists there, import it and do NOT copy.
2. Read a sibling wrapper in `src/common/utilities/` or an adapter under `managers/adapters/` for the interface shape.
3. Confirm the library is added to the service `package.json` (not hoisted-only).

## Tests-first plan

- Mock the underlying SDK at the wrapper boundary; assert the wrapper translates inputs/outputs and surfaces errors as `BusinessException` where appropriate.
- Cover a vendor-error branch (SDK throws → wrapper logs + maps).

## Implementation steps

1. Create `src/common/utilities/<library-name>.utility.ts` (generic utility) OR `managers/adapters/<vendor>.adapter.ts` (domain adapter behind a shared interface).
2. Expose a narrow, typed surface — only the methods the service actually needs. Extract types to `types/`, enums to `src/common/enums/`.
3. Inject/consume the wrapper from services/managers; never `import` the package outside the wrapper.
4. Add logging: `debug` on entry, `info` on side-effecting calls, `error` in catch.
5. If the same wrapper is needed by a second service, promote it to `packages/shared-utilities/` and delete the per-service copy.

## Security considerations

- Never log SDK credentials, API keys, or full payloads; redaction-safe stringify only.
- Validate any URL passed to an outbound HTTP wrapper (SSRF, OWASP A10).
- Keep vendor keys in encrypted config / env, never inline.

## Failure modes

- A service importing the package directly → defeats the wrapping rule; a version bump then ripples everywhere.
- Duplicating a wrapper across services → delivery blocker; move to shared-utilities.
- Leaking the vendor's error type upward instead of mapping to `BusinessException`.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Add the wrapper to `docs/04-backend/adapters-reference.md` and note it in the service `CLAUDE.md` already-wrapped list.

## Definition of done

- One wrapper, narrow surface, SDK mocked in tests, no direct imports elsewhere, docs updated. Cross-service wrappers live in shared-utilities.
