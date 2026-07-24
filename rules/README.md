# ClawAI Rules Catalog

This directory is the authoritative constraint catalog for every contribution to
the ClawAI monorepo — human or AI. It is part of the AI-native engineering
operating system: rules here are written to be read by agents (Claude, Codex,
Cursor, any other) as well as people, and most are backed by an automated
enforcement mechanism so that "the rule" and "the check" never drift apart.

Do not skim. Read [`00-non-negotiable-rules.md`](00-non-negotiable-rules.md)
before touching any code, then the numbered file(s) for your task domain.

## Authority hierarchy (higher wins on conflict)

When two documents disagree, the higher tier is correct and the lower one is a
bug to be fixed. Resolve up, never down.

1. **`CLAUDE.md`** (repo root) — the master project reference and agent operating manual.
2. **`rules/00-non-negotiable-rules.md`** — the hard blockers.
3. **`context/architecture-map.md`** — the canonical service/route/event map.
4. **`context/stack-and-toolchain.md`** — the canonical toolchain contract.
5. **Numbered `rules/*.md`** (this catalog, `01`–`25`).
6. **`skills/*.md`** — operational runbooks (how-to; rules are the what/why).
7. **`context/*` + `memory/*`** — supporting context and durable agent memory.
8. **`.ai/` manifests** (`.ai/manifests/*.json`, `.ai/BOOTSTRAP.md`, `.ai/packs/*.md`) — machine-readable derived facts.
9. **Compact AI routers** (`CODEX.md`, `cursor.md` and other per-tool entrypoints) — mirrors, never originals.

> The legacy `rules/00-master-rules.md … 09-refactor-rules.md` set remains valid
> and is not superseded; this numbered `00-25` catalog is the finer-grained,
> enforcement-tagged expansion that lives alongside it.

## Rule file format

Every numbered file uses the same sections, in this order:

- **Purpose** — the one-paragraph reason the rule exists.
- **Applies to** — which workspaces / file globs / layers it governs.
- **Mandatory rules** — numbered MUSTs.
- **Prohibited patterns** — the specific anti-patterns that fail review.
- **Correct pattern** — a short, ClawAI-grounded path or code example.
- **Enforcement** — the mechanism that catches a violation (see below).
- **Related skills** — pointers into `skills/`.
- **Related context** — pointers into `CLAUDE.md`, `docs/`, `.ai/`.
- **Definition of done** — the checklist for "this rule is satisfied."

## Enforcement mechanisms

Each rule declares how it is enforced. A rule with no automatable check says so
explicitly and falls back to review. The mechanism vocabulary:

| Mechanism             | What it means                                                             |
| --------------------- | ------------------------------------------------------------------------- |
| **ESLint**            | Flat-config rule (`eslint.config.*`), often `no-restricted-syntax`.       |
| **TS config**         | `tsconfig` strictness / `tsgo --noEmit` typecheck.                        |
| **Unit test**         | Jest (backend) / Vitest (frontend) assertion.                             |
| **Architecture test** | A test that asserts structure (layering, boundaries, no cross-DB import). |
| **Knowledge check**   | `npm run knowledge:check` / `knowledge:verify` against `.ai/manifests/`.  |
| **CI job**            | A `.github/workflows/ci.yml` job (lint / typecheck / test / build).       |
| **Git hook**          | Pre-commit / pre-push hook (the per-folder gate).                         |
| **Review checklist**  | Human/agent review — used only when no automated check is feasible.       |

Enforcement points to a real gate. `npm run release:preflight` runs the full
gate set; the per-touched-folder gate (`npm run affected:*`) is the routine bar
before every commit.

## Exceptions and waivers

Rules are strict but not infinite. When a rule genuinely cannot be met, follow
the documented waiver process in [`25-exceptions-and-waivers.md`](25-exceptions-and-waivers.md).
No silent bypasses: an undocumented `eslint-disable`, `@ts-expect-error`, or
`--no-verify` is a defect, not a waiver.
