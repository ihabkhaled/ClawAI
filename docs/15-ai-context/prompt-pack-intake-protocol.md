# Prompt-pack intake protocol

How a prompt pack, execution prompt, plan pack, or implementation brief becomes
shipped work in this repository — and what must happen before any of it is written.

- **Canonical policy**: [`rules/26-prompt-pack-intake-protocol.md`](../../rules/26-prompt-pack-intake-protocol.md)
- **Runbook**: [`skills/execute-prompt-pack.md`](../../skills/execute-prompt-pack.md)
- **Summary**: [`context/prompt-pack-intake.md`](../../context/prompt-pack-intake.md)

## Why this exists

A prompt pack is a specification written outside this repository. It has no
knowledge of our architecture, our lint configuration, our gate topology, or what
we already built. Two failures follow directly, and both were observed before this
protocol was written:

**Building what the pack says instead of what the repo needs.** Packs describe
systems in the abstract — "add an AdSense engine", "add a content registry", "add a
progress channel". Taken literally, each becomes a second implementation of
something that already exists. The repository already has an extend-don't-parallelize
mindset for exactly this reason; the intake protocol is where it gets applied, before
the parallel system is built rather than during review.

**Rebuilding what already shipped.** This is the larger cost. A pack is typically
handed over mid-flight — part of it landed weeks ago, part of it never started. The
actual deliverable is the _remainder_, and the only way to know the remainder is to
audit the code. Two traps inside that audit:

- _Absent is not what the pack assumes._ Grep before concluding something is missing.
- _Present is not wired._ A Prisma model with no repository, a repository method
  with no callers, a service exported but never listed in `providers` — each greps
  as "exists" and functions as nothing. Count it missing.

## The seven steps

| #   | Step                                      | Output                                            |
| --- | ----------------------------------------- | ------------------------------------------------- |
| 1   | Read the pack end to end                  | known contradictions, the real definition-of-done |
| 2   | `npm run knowledge:context -- --task="…"` | `.ai/local/current-context.md`                    |
| 3   | Read governing docs in authority order    | the rules/skills/maps binding this task           |
| 4   | Audit every deliverable against the code  | done / partial / missing per item                 |
| 5   | Review the constraint surface             | what will reject the code, known up front         |
| 6   | Write the plan, state deviations          | ordered work, seams, gates, commits               |
| 7   | Implement                                 | gated commits, each pushed before the next        |

Step 1 is not a formality: section 30 of a pack routinely contradicts section 3, and
the definition-of-done routinely names constraints the body never mentions. Acting on
section 1 while unaware of section 30 is how scope gets built twice.

## The constraint surface (step 5)

Known _before_ writing code, so the code is shaped by it rather than retrofitted:

| Surface                                                                                        | Where it lives                                        |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Banned syntax, inline-declaration bans, size ceilings, import order                            | `eslint.config.mjs` per workspace                     |
| TypeScript strict — no `any`/`!`/`as unknown as`, explicit returns                             | `tsconfig*.json` + rule 12                            |
| Formatting                                                                                     | Prettier — authoritative, never hand-formatted around |
| Coverage floors and required test kinds                                                        | `jest.config.ts` / `vitest.config.ts`, rule 22        |
| Secrets, authz/IDOR, validation, redaction, CSP                                                | rules 16, 19, 21                                      |
| i18n × 9 locales + `i18n.types.ts` same commit                                                 | rule 20                                               |
| Env, installers, compose ×N, nginx, shared packages, health service, CI matrix, TLS SANs, docs | the mandatory delivery checklist in `CLAUDE.md`       |

## The gate topology

**Every GitHub gate must be green before a push counts as done.** A red gate is not
a follow-up item; it is the change not having landed.

| Gate                | Runs    | Fails on                                                                                 |
| ------------------- | ------- | ---------------------------------------------------------------------------------------- |
| pre-commit          | local   | lint-staged, stale generated artifacts, affected typecheck                               |
| pre-push            | local   | affected validation for the pushed range                                                 |
| CI matrix           | Actions | lint → typecheck → test → build, per workspace                                           |
| knowledge freshness | Actions | `knowledge:check` / `knowledge:verify`                                                   |
| inventory audit     | Actions | `audit:check`                                                                            |
| **Lighthouse CI**   | Actions | performance, SEO, best-practices **and accessibility** across every public marketing URL |
| Vercel build        | on push | anything the frontend build rejects                                                      |

### Lighthouse deserves special attention

It is the gate most often forgotten, because it fails on things that compile
perfectly: a colour pair below the contrast ratio, a missing landmark, an unlabelled
control, a skipped heading level. `color-contrast` is asserted at `minScore >= 0.9`
across every URL in `apps/claw-frontend/lighthouserc.json`, and axe scores it 0 for a
_single_ failing element anywhere on the page — so one low-contrast utility class on
one shared component fails four pages at once.

Any change touching a public page, a design token, or a semantic colour must be
checked against it before pushing:

```bash
cd apps/claw-frontend
npx @lhci/cli@0.15.x autorun --config=lighthouserc.json
```

Reading `lighthouserc.json` before choosing a colour is cheaper than discovering the
ratio from a red build.

## Authority on conflict

The pack does not outrank repository policy. Where they disagree, **policy wins** and
the deviation is stated explicitly in the plan — never applied silently, and never
resolved in the pack's favour. See
[ADR-055](../13-adr/adr-055-canonical-ai-authority-hierarchy.md) for the hierarchy and
[ADR-058](../13-adr/adr-058-compact-ai-routers-not-mirrors.md) for why the per-tool
agent files are routers rather than copies of policy.
