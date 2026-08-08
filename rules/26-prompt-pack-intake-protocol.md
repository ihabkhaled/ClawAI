# Rule 26 — Prompt-pack and execution-prompt intake protocol

## Purpose

Define what MUST happen between receiving a prompt pack (or any multi-part
execution prompt) and writing the first line of code.

A prompt pack is a specification written outside this repository. It does not know
our architecture, our lint rules, our gate topology, or what we already built. Two
failure modes follow from that, and both are expensive:

1. **Building what the pack literally says instead of what this repo needs** — a
   second AdSense engine, a parallel SSE channel, a duplicated content registry, a
   new service where an existing seam would do.
2. **Rebuilding what already exists** — the largest single waste. Packs are often
   handed over after part of the work has landed, so the real deliverable is the
   remainder, not the whole.

The protocol below is the cost of avoiding both. It is not optional and it is not
proportional to the size of the pack — a one-paragraph execution prompt gets the
same treatment as a thirty-section one.

## Applies to

Every prompt pack, execution prompt, plan pack, implementation brief, or
multi-step task handed over as a document — whatever it is called, whatever its
source, however urgent it sounds.

## Mandatory rules

### 1. Read the whole pack before acting on any of it

Read every section to the end first. Section 30 routinely contradicts section 3,
and the definition-of-done routinely names constraints the body never mentions.
Acting on section 1 while unaware of section 30 is how scope gets built twice.

### 2. Resolve repository context before planning

```bash
npm run knowledge:context -- --task="<the pack's subject>"
```

Then read `.ai/local/current-context.md`. This is the mechanical entry point to
the authority hierarchy — it resolves which rules, skills, and context maps apply
to the task, so the review below is targeted rather than a blind sweep of every
document in the repo.

### 3. Read the governing documents for the task's domain

In authority order (higher wins on conflict — [ADR-055](../docs/13-adr/adr-055-canonical-ai-authority-hierarchy.md)):

| Layer         | What to read                                                    | What you are looking for                                |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| Root policy   | `CLAUDE.md`                                                     | mandatory checklist, quality gates, per-service notes   |
| Blockers      | `rules/00-non-negotiable-rules.md`                              | what makes a diff unmergeable                           |
| Architecture  | `context/architecture-map.md`, `context/stack-and-toolchain.md` | the seams the pack should extend                        |
| Domain rules  | the numbered `rules/*` for the touched layers                   | backend/frontend/testing/i18n/security/config specifics |
| Runbooks      | the matching `skills/*`                                         | the established way to do this exact operation          |
| Maps          | `context/*` ownership and dependency maps                       | who already owns this concern                           |
| Per-workspace | `apps/<workspace>/CLAUDE.md`, `AGENTS.md`                       | service-local constraints                               |
| Existing docs | `docs/` for the feature area                                    | what shipped already and why                            |

Mirrored agent files (`CODEX.md`, `cursor.md`, `GEMINI.md`, `KIMI.md`, `GLM.md`,
`QWEN.md`, `DEEPSEEK.md`, `MISTRAL.md`, `AGENTS.md`, `.cursorrules`) are compact
routers, not policy — read the canonical source they point to
([ADR-058](../docs/13-adr/adr-058-compact-ai-routers-not-mirrors.md)).

### 4. Audit what already exists — before planning, not after

For every deliverable the pack names, establish whether it is absent, partial, or
already done. Check the code, not the pack's assumptions:

```bash
git log --oneline -40                      # what landed recently
npm run affected:list                      # what a change here would touch
```

Then, per deliverable: does the model exist? the endpoint? the module wiring? the
event? the frontend page? the test? Grep for the symbol before concluding it is
missing, and check for _unused_ exports before concluding it is present — a
repository method with no callers is scaffolding, not a feature.

Produce an explicit **done / partial / missing** verdict per deliverable. That
verdict is the plan's input; the pack's own section list is not.

### 5. Review the constraint surface the code must satisfy

Before writing code, know what will reject it:

- **ESLint** — the flat config for each touched workspace: banned syntax
  (`no-restricted-syntax`), inline-declaration bans, file/method size ceilings,
  import ordering, per-file-type restrictions.
- **TypeScript** — strict; no `any`, no `!`, no `as unknown as`, explicit return
  types.
- **Formatting** — Prettier is authoritative; never hand-format around it.
- **Testing** — coverage floors, the required test kinds for the change class,
  where tests live.
- **Security** — secret handling, authz/IDOR, input validation, redaction,
  injection surfaces, CSP.
- **i18n** — every user-facing string in all nine locales as a real translation,
  plus `i18n.types.ts` in the same commit.
- **Config/infra** — the mandatory delivery checklist in `CLAUDE.md`: `.env.example`,
  both installers, every compose file, nginx, shared constants/types, health
  service, CI matrix, TLS SAN list, docs.
- **Gates — every one of them, known before you write code, not after.**

  | Gate                | Runs             | Fails on                                                                                                                                              |
  | ------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
  | pre-commit          | local, on commit | lint-staged, stale generated artifacts, affected typecheck                                                                                            |
  | pre-push            | local, on push   | affected validation for the pushed range                                                                                                              |
  | CI matrix           | GitHub Actions   | lint → typecheck → test → build, per workspace                                                                                                        |
  | knowledge freshness | GitHub Actions   | `knowledge:check` / `knowledge:verify` — a generated file's hash drifted                                                                              |
  | inventory audit     | GitHub Actions   | `audit:check` — the inventory snapshot drifted                                                                                                        |
  | **Lighthouse CI**   | GitHub Actions   | `@lhci/cli autorun` against every public marketing URL — performance, SEO, best-practices AND **accessibility assertions including `color-contrast`** |

  **Every GitHub gate must be green before a push is considered done** — a red gate
  is not "someone else's follow-up", it is the change not having landed.

  The Lighthouse gate is the one most often forgotten, because it fails on things
  that compile perfectly: a colour pair below 4.5:1, a missing landmark, an unlabelled
  control, a heading level skipped. Any change that touches a public page, a design
  token, or a semantic colour MUST be checked against it — locally with
  `npx @lhci/cli@0.15.x autorun --config=lighthouserc.json` from
  `apps/claw-frontend`, or by reading the assertion list in `lighthouserc.json`
  before choosing a colour.

### 6. Write the plan, and state the deviations

Produce a written plan covering: the audit verdict, the ordered work, the seam
each piece extends, the gates each piece must pass, and the commit sequence.

Where the pack conflicts with repository policy, **policy wins** — and the
deviation is stated explicitly in the plan rather than silently applied. A pack
asking for a second content registry gets an extension of the existing one, and a
sentence saying so.

Where the pack is ambiguous in a way that changes the deliverable, ask. Where it
is ambiguous in a way that does not, decide, state the assumption, and continue.

### 7. Only then implement

Follow the repository's own lifecycle from that point: TDD where the rules require
it, scoped gates per touched workspace, one gated commit per coherent change,
pushed before the next begins (rule 07 / rule 23).

## Prohibited patterns

- Starting to code after reading part of a pack.
- Treating the pack's section list as the work list without an existence audit.
- Building a parallel system because the pack described one, when a seam exists.
- Discovering a lint rule, a gate, or a checklist item _after_ writing the code
  and reshaping the work around it retroactively.
- Following the pack over repository policy, or deviating from the pack silently.
- Reporting a deliverable as complete because the pack listed it, without having
  verified it in the code.

## Correct pattern

```text
read pack end-to-end
  → npm run knowledge:context
  → read governing docs for the domain (authority order)
  → audit each deliverable: done / partial / missing
  → review constraint surface (eslint, ts, tests, security, i18n, infra, gates)
  → write plan: work, seams, gates, commits, stated deviations
  → implement, gate, commit, push, repeat
```

## Enforcement

- Self-enforced at intake; a plan without an audit verdict is not a plan.
- Downstream gates catch the symptoms (a duplicated engine fails review; a missed
  checklist item fails CI or a stale-artifact check) — but they catch them late,
  which is the cost this rule exists to avoid.
- `npm run knowledge:verify` enforces that the canonical documents stay
  self-consistent, so the sources this protocol sends you to remain trustworthy.

## Related skills

- [execute-prompt-pack](../skills/execute-prompt-pack.md) — the runbook
- [resolve-task-context](../skills/resolve-task-context.md)
- [reuse-before-creating](../skills/reuse-before-creating.md)
- [inspect-affected-workspaces](../skills/inspect-affected-workspaces.md)
- [commit-and-push-each-change](../skills/commit-and-push-each-change.md)

## Related context

- [`../context/task-router.md`](../context/task-router.md)
- [`../context/architecture-map.md`](../context/architecture-map.md)
- [`../rules/01-task-intake-and-planning.md`](01-task-intake-and-planning.md)

## Definition of done

- [ ] Whole pack read before any code was written.
- [ ] `knowledge:context` run and its output read.
- [ ] Governing rules, skills, context maps and per-workspace files read for the
      touched domains.
- [ ] Every pack deliverable has an explicit done / partial / missing verdict
      derived from the code.
- [ ] Constraint surface reviewed: eslint, TypeScript, formatting, tests,
      security, i18n, infra checklist, and every gate the change can trip.
- [ ] Written plan exists, with deviations from the pack stated explicitly.
- [ ] Implementation followed the plan, not the pack's section order.
