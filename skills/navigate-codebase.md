---
name: navigate-codebase
summary: Find files, symbols, endpoints, enums, and events fast across the 17-service monorepo using grep recipes and the knowledge tooling.
task_keywords:
  [
    navigate,
    find file,
    where is,
    locate,
    grep,
    search codebase,
    endpoint,
    enum,
    event,
    symbol,
    structure,
    layout,
    discovery,
    orient,
  ]
applies_to: [all-workspaces, monorepo-root]
required_rules: [00-master-rules, 02-backend-rules, 03-frontend-rules]
required_context: [codebase-navigation, ai-context-pack]
affected_workspaces: [none-read-only]
required_tests: [none-read-only]
required_docs: [none]
validation_lane: npm run knowledge:context -- --task="..." (read-only)
---

## When to use

You need to locate where something lives before changing it: a file, a symbol,
an HTTP endpoint, an enum definition and its usages, an event pattern, or the
service that owns a domain. This skill is the grep-and-manifest layer that sits
on top of the deterministic resolver.

## When NOT to use

Do not use raw grep as step 1 — run [`./resolve-task-context.md`](./resolve-task-context.md)
first; it may hand you the file list directly. Do not use this to _decide
ownership_ — that is [`./find-canonical-owner.md`](./find-canonical-owner.md).
For tracing a full request or event flow, use the dedicated trace skills.

## Read first

- [`./01-codebase-navigation.md`](./01-codebase-navigation.md) — the full
  structural map (backend + frontend directory layout, key files table)
- [`../docs/15-ai-context/codebase-navigation.md`](../docs/15-ai-context/codebase-navigation.md)
- [`../docs/04-backend/services-index.md`](../docs/04-backend/services-index.md)

## Repository discovery steps

Mental model: `apps/claw-<name>-service/` (backend, NestJS + Prisma),
`apps/claw-frontend/` (Next.js), `packages/shared-*` (6 shared packages).
Ports: auth 4001, chat 4002, connector 4003, routing 4004, memory 4005,
file 4006, audit 4007, ollama 4008, health 4009, client-logs 4010,
server-logs 4011, image 4012, file-generation 4013, workspace 4014, agent 4015,
research 4016, llamacpp 4017.

## Tests-first plan

Before concluding "the code lives here," confirm the match is the definition and
not just a reference: for a symbol, grep for its `class`/`enum`/`function`
declaration, not only call sites; for an endpoint, confirm the decorator is in a
`*.controller.ts`. Cross-check one hit against
[`./01-codebase-navigation.md`](./01-codebase-navigation.md)'s key-files table.

## Implementation steps

1. **Find a file** by name pattern:
   ```bash
   find apps/ packages/ -name "*routing.constants.ts"
   ```
2. **Find a symbol definition vs usages:**
   ```bash
   grep -r "enum ConnectorStatus" apps/ packages/ --include="*.ts"   # definition
   grep -r "ConnectorStatus\." apps/ --include="*.ts"                # usages
   ```
3. **Find all endpoints in a service:**
   ```bash
   grep -rn "@Get\|@Post\|@Put\|@Patch\|@Delete" \
     apps/claw-connector-service/src --include="*.controller.ts"
   ```
4. **Find an event pattern:** look in `packages/shared-types/src/events`, then
   grep publishers/consumers (see [`./trace-event-end-to-end.md`](./trace-event-end-to-end.md)).
5. **Find frontend query keys / repositories:**
   ```bash
   grep -rn "keyFactory\|queryKey" apps/claw-frontend/src/repositories/shared/query-keys.ts
   ```

## Security considerations

Search is read-only. When you grep secrets-adjacent terms (`ENCRYPTION_KEY`,
`JWT_SECRET`, `apiKey`), never copy the _value_ into notes or reports — only the
file path and the fact of usage.

## Failure modes

- **Reference mistaken for definition** — always confirm with a declaration grep.
- **Missed a barrel export** — check `index.ts` re-exports in `enums/`,
  `types/`, `constants/`.
- **Grepped generated code** — ignore `generated/prisma/` and `dist/`.

## Validation commands

```bash
npm run knowledge:context -- --task="find where X is defined"   # cross-check pack
grep -rn "class <Symbol>\|enum <Symbol>\|function <Symbol>" apps/ packages/ --include="*.ts"
```

## Documentation updates

None — navigation only. If your subsequent change adds a symbol, its owning
skill lists the docs to update.

## Definition of done

You have the exact file path(s) of the _definition_ (not just references) and
have confirmed which service/package owns it.
