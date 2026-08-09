---
name: execute-prompt-pack
summary: Turn a prompt pack or execution prompt into shipped work — read it whole, resolve repo context, audit what already exists, review the constraint surface, plan, then implement against gates.
task_keywords:
  [
    prompt pack,
    execution prompt,
    plan pack,
    implementation brief,
    implement this,
    build this feature,
    spec,
  ]
applies_to: [all-workspaces, monorepo-root]
required_rules:
  [
    26-prompt-pack-intake-protocol,
    01-task-intake-and-planning,
    07-commit-rules,
    23-git-commits-hooks-and-release-gates,
  ]
required_context: [task-router, architecture-map, stack-and-toolchain, workspace-map]
affected_workspaces: [varies-with-pack]
required_tests: [scoped-to-touched-workspaces]
required_docs: [feature-area-docs]
validation_lane: npm run knowledge:context
---

## When to use

Whenever work arrives as a document rather than a one-line request: a prompt pack,
an execution prompt, a plan pack, an implementation brief. Also when asked to
"continue" or "finish" one — that case needs the audit step most of all.

## When NOT to use

For a genuine one-liner with no document behind it ("fix the typo in the login
label"). Rule 26 still applies to anything with sections.

## Read first

- [`../rules/26-prompt-pack-intake-protocol.md`](../rules/26-prompt-pack-intake-protocol.md)
  — the authoritative protocol; this file is its runbook
- [`../context/task-router.md`](../context/task-router.md)

## Steps

### 1. Read the pack end to end

All of it, before acting on any of it. Note internal contradictions — section 30
routinely disagrees with section 3, and the definition-of-done often names
constraints the body never mentions.

### 2. Resolve repository context

```bash
npm run knowledge:context -- --task="<the pack's subject>"
cat .ai/local/current-context.md
```

### 3. Read the governing documents (authority order)

`CLAUDE.md` → `rules/00-non-negotiable-rules.md` → `context/architecture-map.md`

- `context/stack-and-toolchain.md` → the numbered `rules/*` for the touched layers
  → the matching `skills/*` → `context/*` ownership maps → the touched
  `apps/*/CLAUDE.md` and `AGENTS.md` → `docs/` for the feature area.

Other agent files are routers, not policy. Read what they point at.

### 4. Audit every deliverable against the code

```bash
git log --oneline -40
npm run affected:list
```

Per deliverable, check the code — never the pack's assumption:

```bash
# does the shape exist at all?
grep -rn "<Symbol>" apps/<workspace>/src --include=*.ts | grep -v __tests__

# is it wired, or just present?
grep -rn "<Symbol>" apps/<workspace>/src | grep -v "<file that defines it>"
```

A repository method or service with **no callers** is scaffolding, not a feature —
count it as missing. Record a **done / partial / missing** verdict per deliverable.
That verdict, not the pack's section list, is the work list.

### 5. Review the constraint surface

Know what will reject the code before writing it:

```bash
cat apps/<workspace>/eslint.config.mjs        # banned syntax, size ceilings, per-file rules
cat apps/<workspace>/CLAUDE.md                # service-local constraints
grep -n "coverageThreshold" apps/<workspace>/jest.config.ts
```

Plus, from `CLAUDE.md`: the mandatory delivery checklist (`.env.example`, both
installers, every compose file, nginx, shared constants/types, health service, CI
matrix, TLS SANs, docs, i18n × 13), and the full gate topology — pre-commit
(lint-staged → generated-artifact regeneration → affected typecheck), pre-push, the
CI matrix, knowledge-freshness + inventory-audit checks, **Lighthouse CI**, and the
Vercel build.

```bash
cat apps/claw-frontend/lighthouserc.json      # asserted URLs + accessibility bars
```

**Every GitHub gate must be green before a push counts as done.** Lighthouse is the
one most often forgotten: it fails on things that compile perfectly — a colour pair
under 4.5:1, a missing landmark, an unlabelled control, a skipped heading level. Any
change touching a public page, a design token, or a semantic colour must be checked
against it before pushing:

```bash
cd apps/claw-frontend && npx @lhci/cli@0.15.x autorun --config=lighthouserc.json
```

### 6. Write the plan

Audit verdict, ordered work, the seam each piece extends, the gates each piece
trips, the commit sequence. State every deviation from the pack explicitly —
**policy wins over the pack**, but silently is not acceptable.

### 7. Implement

Per the repository lifecycle: tests where required, scoped gates per touched
workspace, one gated commit per coherent change, pushed before the next starts.

## Failure modes

- **Coding from section 1 while unaware of section 30.** The pack's own
  definition-of-done changes the design.
- **Skipping the audit on a "continue this" pack.** Rebuilding what shipped is the
  single largest waste this skill exists to prevent.
- **Mistaking presence for wiring.** A model in the schema with no repository, a
  repository with no callers, an exported service never provided in a module —
  each looks done in a grep and is not.
- **Discovering a lint rule after the fact** and reshaping working code around it.
- **Following the pack into a parallel system** when a seam exists (rule: extend,
  don't parallelize).
- **Reporting a deliverable done because the pack listed it.** Verify in the code.

## Validation commands

```
npm run knowledge:context -- --task="<subject>"
npm run affected:list
cd <workspace> && npm run typecheck && npm run lint && npm test && npm run build
npm run knowledge:verify
```

## Documentation updates

Whatever the pack's changes touch: `docs/` for the feature area, the per-service
`CLAUDE.md`, and the generated artifacts (`npm run knowledge:build`, `npm run audit`)
— the pre-commit hook regenerates and stages these, but a stale artifact turns CI
red for everyone, so know that it happens.

## Definition of done

Rule 26's checklist is satisfied: pack read whole, context resolved, governing docs
read, every deliverable audited against the code, constraint surface reviewed, plan
written with deviations stated, and implementation gated and pushed per commit.
