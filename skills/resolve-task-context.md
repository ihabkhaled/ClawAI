---
name: resolve-task-context
summary: The mandatory first step of every task — run the deterministic context resolver, read the emitted bundle, then scope affected folders.
task_keywords:
  [
    context,
    resolve,
    knowledge context,
    first step,
    task classification,
    affected list,
    pack,
    validation lane,
    pitfalls,
    scope,
    where to start,
    onboarding a task,
  ]
applies_to: [all-workspaces, monorepo-root]
required_rules: [00-master-rules, 01-planning-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [none-read-only]
required_tests: [none-read-only]
required_docs: [none]
validation_lane: npm run knowledge:context -- --task="..." && npm run affected:list
---

## When to use

Run this **before anything else, on every task** — feature, bug fix, refactor,
review, or investigation. It is the entry point that every other skill's
"Read first" section points to. It classifies your task into a curated pack and
hands you the exact rules, skills, validation lane, and known pitfalls, then
tells you which workspace folders you must gate.

## When NOT to use

Never skip it, but you do not re-run it for each sub-step of the same task — run
once at task start, then again only if scope materially changes (e.g. you
discover the change also touches a second service).

## Read first

- [`../rules/00-master-rules.md`](../rules/00-master-rules.md) — the 8 blockers and per-folder gate rule
- [`../rules/01-planning-rules.md`](../rules/01-planning-rules.md) — Phase 0 planning gate
- [`../docs/15-ai-context/ai-context-pack.md`](../docs/15-ai-context/ai-context-pack.md)
- [`./navigate-codebase.md`](./navigate-codebase.md) for the follow-on discovery step

## Repository discovery steps

The resolver (`tools/knowledge/context.mjs` + `classify-task.mjs`) is fully
deterministic — no AI. It (1) builds repo manifests, (2) classifies the task
into a pack (`authentication-security`, `rabbitmq-event`, `database-migration`,
`chat-streaming`, `ai-provider-connector`, `model-routing`, `frontend-feature`,
`workspace-connector`, `infrastructure`, `documentation`, …), (3) ranks
governance docs under `rules/` and `skills/` by task-term overlap (top ~8),
(4) emits a ~6k-token linked bundle. Keyword-rich phrasing in `--task` sharpens
the classification.

```bash
# Primary call — always pass a specific task description
npm run knowledge:context -- --task="add a critic model field to the compare DTO"

# Narrowing flags (combine as needed)
npm run knowledge:context -- --task="..." --service=claw-chat-service
npm run knowledge:context -- --task="..." --event=message.completed
npm run knowledge:context -- --task="..." --route=/api/v1/chat-messages
npm run knowledge:context -- --task="..." --files=apps/claw-chat-service/src/...
npm run knowledge:context -- --task="..." --symbols=ChatExecutionManager
npm run knowledge:context -- --task="..." --max-tokens=8000
```

## Tests-first plan

This is a read-only routing step, so "tests" means: confirm the resolver's
output actually matches your task. Verify the emitted pack name, the ranked
rules, and the `validation_lane` look right for what you intend to change. If
the pack is wrong (e.g. you get `documentation` for a code change), refine the
`--task` wording and re-run before writing any code.

## Implementation steps

1. Run `npm run knowledge:context -- --task="<one-sentence task>"`.
2. Read the emitted bundle top-to-bottom: pack, reviewers, ranked rules, ranked
   skills, validation lane, pitfalls.
3. Open the ranked rule/skill files it names — those are your binding
   constraints and runbooks for this task.
4. Run `npm run affected:list` to see which workspace folders your working-tree
   changes touch (see [`./inspect-affected-workspaces.md`](./inspect-affected-workspaces.md)).
5. Only now proceed to the domain skill (backend/frontend/etc.) and the
   Phase 0 planning gate.

## Security considerations

The resolver reads source only; it never mutates. Do not paste secrets into the
`--task` string — it is echoed into logs. If your task involves auth or
secrets, expect the `authentication-security` pack and read
[`../rules/08-security-rules.md`](../rules/08-security-rules.md).

## Failure modes

- **Vague `--task` → wrong pack.** Add concrete nouns (service, event, route).
- **Bundle too large to act on.** Lower `--max-tokens` or add `--service` /
  `--files` to focus.
- **Skill you expected didn't surface.** Its keywords are weak — note it and
  strengthen that skill's `task_keywords` later.

## Validation commands

```bash
npm run knowledge:context -- --task="..."   # bundle prints, pack matches intent
npm run affected:list                        # folders to gate are listed
npm run knowledge:verify                     # knowledge graph is consistent
```

## Documentation updates

None for the resolver run itself. The bundle it emits tells you which
`required_docs` your actual change must update.

## Definition of done

You have read the emitted bundle, opened its ranked rules/skills, know your
pack, know your validation lane, and have the `affected:list` folder set — all
before writing a line of code.
