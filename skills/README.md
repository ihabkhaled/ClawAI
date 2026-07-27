# ClawAI Skills — Catalog & Entry Point

> Skills are god-mode operational runbooks for AI agents (and humans) working on
> ClawAI. This README explains the skill file format, how skills relate to
> `rules/`, agents, and context docs, and — most importantly — **how the
> deterministic context resolver surfaces skills**. Read this once, then let the
> resolver route you.

---

## Run the resolver FIRST

Before opening any skill by hand, run the knowledge context resolver. It is a
**deterministic** (no-AI) lexical/structural tool that classifies your task and
hands back the exact rules, skills, validation lane, and pitfalls that apply:

```bash
npm run knowledge:context -- --task="add a new RabbitMQ event consumer to audit-service"
npm run affected:list
```

See [`./resolve-task-context.md`](./resolve-task-context.md) for the full flag
list and workflow. Every skill's **Read first** section points back to it.

### How the resolver surfaces skills (ground truth)

`npm run knowledge:context` (backed by `tools/knowledge/context.mjs` +
`classify-task.mjs`):

1. Builds repo manifests of services, packages, events, and routes.
2. **Classifies** the task into a curated _pack_ (e.g. `authentication-security`,
   `rabbitmq-event`, `database-migration`, `chat-streaming`,
   `ai-provider-connector`, `model-routing`, `frontend-feature`,
   `workspace-connector`, `infrastructure`, `documentation`). Each pack carries
   reviewers, validation lanes, and known pitfalls.
3. **Ranks governance docs** under both `rules/` and `skills/` by task-term
   overlap across their full markdown text, emitting the top ~8.
4. Emits a compact ~6k-token linked context bundle.

**Consequence:** keyword-rich frontmatter (`task_keywords`, `applies_to`) and
body text are exactly what make a skill surface for a task. Write skills with
the trigger terms an agent would actually type.

---

## Skill file format

Every skill file begins with this frontmatter block:

| Field                 | Meaning                                                |
| --------------------- | ------------------------------------------------------ |
| `name`                | kebab-name matching the filename without `.md`         |
| `summary`             | one-line description                                   |
| `task_keywords`       | trigger terms the resolver ranks against               |
| `applies_to`          | workspaces or layers the skill covers                  |
| `required_rules`      | rule basenames (without `.md`) that constrain the work |
| `required_context`    | context doc basenames to read                          |
| `affected_workspaces` | services/packages likely touched                       |
| `required_tests`      | test types the work needs                              |
| `required_docs`       | docs to update on completion                           |
| `validation_lane`     | the exact command lane to gate the change              |

After the frontmatter, every skill has these **12 sections, in order**:

1. **When to use**
2. **When NOT to use**
3. **Read first**
4. **Repository discovery steps**
5. **Tests-first plan**
6. **Implementation steps**
7. **Security considerations**
8. **Failure modes**
9. **Validation commands**
10. **Documentation updates**
11. **Definition of done**

Navigation/read-only skills keep all 12 sections; their "Tests-first plan"
states how to confirm the trace, and their "Validation commands" are the
grep/knowledge commands that verify the finding.

---

## How skills relate to everything else

- **`rules/`** are non-negotiable constraints (see
  [`../rules/00-master-rules.md`](../rules/00-master-rules.md)). Skills are the
  _how-to_; they cite the rules that bind them. A skill never overrides a rule.
- **Agents** — specialized reviewer/author agents invoke skills to do work the
  right way, then report conclusions.
- **Context docs** — `docs/` (esp. [`../docs/15-ai-context/`](../docs/15-ai-context/)
  and [`../docs/03-architecture/`](../docs/03-architecture/)) are the ground
  truth skills point you to. Skills route; docs explain.

---

## Skill catalog

### Navigation (read-only tracing)

| Skill                                                                | Purpose                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`resolve-task-context.md`](./resolve-task-context.md)               | **Step 1 of every task** — run the resolver, scope affected folders       |
| [`navigate-codebase.md`](./navigate-codebase.md)                     | Find files/flows; grep recipes for endpoints/enums/events                 |
| [`trace-request-end-to-end.md`](./trace-request-end-to-end.md)       | Trace an HTTP request FE repository → nginx → controller → service → repo |
| [`trace-event-end-to-end.md`](./trace-event-end-to-end.md)           | Trace a RabbitMQ event publisher → `claw.events` → consumer               |
| [`trace-frontend-feature.md`](./trace-frontend-feature.md)           | Trace page.tsx → controller hook → hooks/queries → repository             |
| [`find-canonical-owner.md`](./find-canonical-owner.md)               | Which service/package owns a concept; where a util belongs                |
| [`inspect-affected-workspaces.md`](./inspect-affected-workspaces.md) | `affected:list` + variants; per-touched-folder gate scoping               |

### Legacy numbered skills (still authoritative)

The original numbered runbooks remain in force and are cross-linked from the
navigation skills above:

- [`00-index.md`](./00-index.md)
- [`01-codebase-navigation.md`](./01-codebase-navigation.md)
- [`02-service-scaffold.md`](./02-service-scaffold.md)
- [`03-feature-scaffold.md`](./03-feature-scaffold.md)
- [`04-debug-toolkit.md`](./04-debug-toolkit.md)
- [`05-qa-toolkit.md`](./05-qa-toolkit.md)
- [`06-docker-toolkit.md`](./06-docker-toolkit.md)
- [`07-database-toolkit.md`](./07-database-toolkit.md)
- [`08-event-bus-toolkit.md`](./08-event-bus-toolkit.md)
- [`09-refactor-toolkit.md`](./09-refactor-toolkit.md)

### Billing and scheduled operations

- [`reconcile-billing-state.md`](./reconcile-billing-state.md)
- [`debug-a-stuck-scheduled-job.md`](./debug-a-stuck-scheduled-job.md)
- [`add-a-payment-gateway-flow.md`](./add-a-payment-gateway-flow.md)

---

## Keeping skills current

When you discover a technique, shortcut, or trigger term the resolver should
rank on, add it to the relevant skill's `task_keywords` and body. Stale skills
route agents wrong.
