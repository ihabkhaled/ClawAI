# Skill File Specification

Every skill file in `work/skills/` MUST follow this exact format. Deviations are blocked at review time by the skill-file linter (`scripts/validate-skills.mjs`).

## File location

- Skills live under a category folder: `work/skills/<category>/<skill-id>.md`
- Skill IDs are lowercase, hyphen-separated: `backend-module-design`, `e2e-scenario-design`
- One skill per file. No exceptions. Mega-docs are a code smell.

## Metadata (YAML frontmatter)

Every skill file MUST start with YAML frontmatter:

```yaml
---
id: backend-module-design
title: Backend Module Design
category: backend
level: mandatory
depends_on:
  - foundations/architecture-awareness
  - foundations/coding-standards-awareness
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---
```

### Field definitions

| Field           | Type     | Required | Purpose                                                                                        |
| --------------- | -------- | -------- | ---------------------------------------------------------------------------------------------- |
| `id`            | string   | yes      | Unique kebab-case identifier                                                                   |
| `title`         | string   | yes      | Human title (sentence case)                                                                    |
| `category`      | string   | yes      | Folder name (`backend`, `frontend`, `security`, …)                                             |
| `level`         | enum     | yes      | `mandatory` \| `recommended` \| `advanced`                                                     |
| `depends_on`    | string[] | optional | Other skills to load first (by id or path)                                                     |
| `applies_to`    | string[] | yes      | Surfaces this applies to (e.g. `backend-service`, `frontend-page`, `workspace-adapter`, `all`) |
| `status`        | enum     | yes      | `active` \| `draft` \| `deprecated`                                                            |
| `version`       | semver   | yes      | Bump major on breaking rule changes                                                            |
| `last_reviewed` | ISO date | yes      | Updated on every review                                                                        |
| `owners`        | string[] | yes      | Team or named owners                                                                           |
| `replaces`      | string   | optional | ID of the skill this replaces (for deprecations)                                               |
| `replaced_by`   | string   | optional | Set when `status: deprecated`                                                                  |

## Required sections

Every active skill file MUST include these sections, in this order:

### 1. Purpose (1–2 sentences)

What problem does this skill prevent or what outcome does it produce? No fluff.

### 2. When to use (bullet list)

Which tasks trigger this skill. Be concrete: "Changing any backend service module", not "when working on code".

### 3. Inputs required (bullet list)

What the agent needs in hand before running the workflow. If something is missing, stop and gather it first.

### 4. Workflow (numbered steps)

Exact, executable steps. One action per step. No "and also" compound steps.

### 5. Strict rules (MUST / MUST NOT)

Bulleted, imperative. "MUST use Zod schema" beats "validation is encouraged". Split into:

- **MUST** — if violated, the change is blocked.
- **MUST NOT** — same bar, negative form.

### 6. Anti-patterns (bullet list)

Concrete bad examples from our codebase or widely recognized mistakes. Each anti-pattern names what goes wrong and why.

### 7. Validation checklist

Markdown checkbox list the agent walks before commit. Each item is either true or false — no ambiguity.

```markdown
- [ ] ESLint passes with 0 errors
- [ ] Typecheck passes with 0 errors
- [ ] All new endpoints respond with documented shape
- [ ] ...
```

### 8. Quality gate

A `gate` table describing what's a blocker and what proves the gate passed.

```markdown
| Check                     | Blocker?                 | Evidence                      |
| ------------------------- | ------------------------ | ----------------------------- |
| 0 ESLint errors           | yes                      | `npm run lint` output         |
| 98%+ coverage on new code | yes (for critical paths) | `npm run test:cov` summary    |
| QA script passes          | yes                      | `qa/test-<feature>.sh` output |
```

### 9. Test requirements

What tests MUST exist. Coverage bar. Edge cases that MUST be covered.

### 10. Definition of done

A numbered list. When every item is true, the skill's work is complete.

### 11. Examples

At least one worked example pointing to real files or PRs in the repo. Skills without examples drift.

### 12. References

Links to CLAUDE.md sections, docs/ pages, or related skill files.

## Optional sections

- **Exceptions** — explicitly documented situations where a rule is relaxed, with justification.
- **Migration notes** — only when a skill changed its rules in a breaking way.
- **FAQ** — common confusions worth documenting.

## Strict-vs-guidance notation

- Use **MUST**, **MUST NOT**, **BLOCKER** in CAPS for rules that are enforced.
- Use **SHOULD**, **RECOMMEND**, **CONSIDER** for guidance.
- Use **MAY** for truly optional.
- Never mix the two in a single bullet — split into separate bullets.

## Marking blockers

Any rule that blocks delivery MUST include the token `BLOCKER` inline. The validator greps for this string to produce the release blocker report.

```markdown
- **MUST** run `npm run typecheck` with 0 errors before commit. **BLOCKER** if violated.
```

## Marking test requirements

Use a table with `Type`, `Scope`, `Bar`:

```markdown
| Type        | Scope                     | Bar                                      |
| ----------- | ------------------------- | ---------------------------------------- |
| Unit        | every pure function       | ≥98% line coverage on critical paths     |
| Integration | every controller endpoint | happy + 401 + 400 + 404                  |
| QA script   | new feature               | `qa/test-<feature>.sh` passes 0 failures |
```

## Marking definition of done

Each numbered DoD item must be objectively checkable (no "well-designed", no "good enough"). If it needs a human judgment, state exactly who signs off.

## Dependency resolution

Agents load skills in this order, always:

1. `foundations/*` (every skill there, in file order)
2. `depends_on` chain of the currently-relevant skills (deepest first)
3. The target skill itself

Circular dependencies MUST NOT exist. The validator fails the build on cycles.

## Conflict resolution

Two rules conflict when following both is impossible. When that happens:

1. The **more restrictive** rule wins (safer default).
2. Exceptions MUST be documented in the skill's `Exceptions` section with rationale.
3. If the conflict is between a mandatory skill and an advanced skill, the mandatory skill wins.
4. Persistent conflicts are opened as skill-governance issues and resolved by the owners listed in `OWNERS.md`.

## Versioning

- Follow SemVer.
- Patch (`1.0.0 → 1.0.1`) — typos, clarifications, added examples.
- Minor (`1.0.0 → 1.1.0`) — new sections, new recommended rules.
- Major (`1.0.0 → 2.0.0`) — any MUST/MUST NOT change, any removed rule, any changed DoD item.

## Deprecation

- Change `status` to `deprecated`.
- Set `replaced_by` to the successor skill ID.
- Move file to `work/skills/.archive/<category>/<skill-id>.md` after the grace period.
- Leave a 1-line note at the top: `> Deprecated YYYY-MM-DD. See <successor-id>.`

## Auditing compliance

Skills are audited via three signals:

1. **Passive** — the validator confirms the file format is valid on every PR.
2. **Active** — for each merged PR, the skill owner spot-checks that the claimed skills were actually followed.
3. **Outcome** — `KPIS.md` tracks defect rate, delivery speed, coverage trends over quarters.

## Example skeleton

See `templates/skill.template.md` for a blank file you can copy. See `foundations/architecture-awareness.md` for a fully filled example.
