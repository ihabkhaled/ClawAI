---
name: reuse-before-creating
summary: Search shared packages and sibling services before writing any new utility, type, constant, or "new service" — extend the existing seam, never parallelize it.
task_keywords:
  [
    reuse,
    duplicate,
    shared-utilities,
    shared-constants,
    shared-types,
    extend,
    parallelize,
    new utility,
    helper,
    dedup,
    before creating,
    DRY,
  ]
applies_to:
  [
    packages/shared-utilities,
    packages/shared-constants,
    packages/shared-types,
    apps/claw-*-service,
    apps/claw-frontend,
  ]
required_rules: [09-refactor-rules, 02-backend-rules, 00-master-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [packages/*, apps/claw-*-service]
required_tests: [review-only]
required_docs: [packages/shared-utilities/README.md]
validation_lane: 'cd <touched-workspace> && npm run typecheck && npm run lint && npm test && npm run build'
---

# Skill: Reuse Before Creating

## When to use

- You are about to write a utility, type, constant, enum, guard, or adapter.
- You are tempted to scaffold "a new service that does X but for Y".
- You spot logic that feels familiar — it may already live in a shared package or a sibling service.
- Before starting ANY refactor or feature that adds a helper.

## When NOT to use

- The thing is genuinely service-specific glue with no cross-service value (keep it local).
- You are editing an existing file's behaviour, not adding new surface area.
- Third-party-generated files (Prisma client, locale files, generated catalogs).

## Read first

- `./resolve-task-context.md` — run `npm run knowledge:context -- --task="..."` to rank rules/skills.
- `rules/09-refactor-rules.md` §R6 (cross-service dedup) and the extend-don't-parallelize mindset.
- `./09-refactor-toolkit.md` (Step 2 adopt shared-utilities), `./remove-duplicate-code.md` (sibling).

## Repository discovery steps

1. Search the three shared packages first — functions in `shared-utilities`, values in `shared-constants`, types in `shared-types`:
   - `grep -rn "<concept>" packages/shared-utilities/src packages/shared-constants/src packages/shared-types/src`
2. Search sibling services for the same helper name/shape:
   - `grep -rln "<helperName>" apps/*/src/common/utilities`
3. Ask the seam question: does an existing layer (auth pipeline, RBAC, `RabbitMQService`, SSE rich-progress, http-client retry, repository pattern, capability framework) already solve this class? If yes, extend it.
4. Check `packages/shared-utilities/README.md` — it catalogues what already exists.

## Tests-first plan

- If you decide to extend a shared package, add/extend the test file in that package's `__tests__/` BEFORE the code, covering happy + boundary + null/empty/invalid inputs.
- If you reuse an existing util, no new test is needed beyond the caller's coverage.

## Implementation steps

1. If it exists in a shared package → import it: `import { x } from '@claw/shared-utilities'`. Do not copy-paste.
2. If it exists in exactly one sibling and you now need it in a second → this is a duplicate-in-the-making. Move it to `packages/shared-utilities` (functions), `shared-constants` (values), or `shared-types` (types), then import in both. See `./remove-duplicate-code.md`.
3. If it exists nowhere and is domain-neutral → create it in the correct shared package, not in a service.
4. If it is truly service-specific → create it in `apps/claw-<service>-service/src/common/utilities/<name>.utility.ts` with a dedicated test.
5. Never introduce a second way to do what the codebase already does once.

## Security considerations

- Reused crypto/jwt/url-safety helpers must come from `@claw/shared-utilities`, never hand-rolled per service.
- Never log secrets when adding logging to a reused helper; extend Pino redaction, don't bypass it.

## Failure modes

- Copy-pasting a util into a second service (creates the exact duplicate R6 bans).
- Leaving a per-service wrapper around a shared util (delete the wrapper, import directly).
- Building `claw-<thing>-service` when a seam in an existing service would have sufficed.

## Validation commands

- `cd <touched-workspace> && npm run typecheck && npm run lint && npm test && npm run build`
- If a shared package changed, rebuild dependents per `./06-docker-toolkit.md`.

## Documentation updates

- Update `packages/shared-utilities/README.md` if you add a shared utility.
- Update root `CLAUDE.md` only if a new cross-cutting pattern was introduced (rare).

## Definition of done

- No new duplicate exists; the new/edited caller imports from the shared package or an existing seam.
- Per-touched-folder gates green; commit as `refactor(...)` or `feat(...)` per conventional commits.
