# Context — prompt-pack intake

What must be true before code is written in response to a prompt pack, execution
prompt, plan pack, or implementation brief.

Canonical policy: [`../rules/26-prompt-pack-intake-protocol.md`](../rules/26-prompt-pack-intake-protocol.md).
Runbook: [`../skills/execute-prompt-pack.md`](../skills/execute-prompt-pack.md).

## The seven steps

| #   | Step                                      | Output                                               |
| --- | ----------------------------------------- | ---------------------------------------------------- |
| 1   | Read the pack end to end                  | known contradictions and the real definition-of-done |
| 2   | `npm run knowledge:context -- --task="…"` | `.ai/local/current-context.md`                       |
| 3   | Read governing docs in authority order    | the rules/skills/maps that bind this task            |
| 4   | Audit every deliverable against the code  | done / partial / missing per item                    |
| 5   | Review the constraint surface             | what will reject the code, known in advance          |
| 6   | Write the plan, state deviations          | ordered work, seams, gates, commits                  |
| 7   | Implement                                 | gated commits, each pushed before the next           |

## Why step 4 exists

A pack is written outside the repository and is usually handed over mid-flight. The
deliverable is the **remainder**, not the whole. Two checks matter:

- **Absent ≠ what the pack assumes.** Grep before concluding something is missing.
- **Present ≠ wired.** A repository method with no callers, a service exported but
  never provided, a schema model with no repository — each greps as "exists" and
  ships as nothing. Count it missing.

## Why step 5 exists

The alternative is discovering a constraint after the code is written and reshaping
working code around it. The surface to know up front:

- ESLint flat config per touched workspace — banned syntax, inline-declaration
  bans, size ceilings, import order, per-file-type restrictions
- TypeScript strict — no `any`, no `!`, no `as unknown as`, explicit returns
- Prettier — authoritative; never hand-format around it
- Coverage floors and the required test kinds
- Security — secrets, authz/IDOR, validation, redaction, CSP
- i18n — nine locales, real translations, `i18n.types.ts` same commit
- The `CLAUDE.md` delivery checklist — env, installers, compose, nginx, shared
  packages, health service, CI matrix, TLS SANs, docs
- Gate topology, all of it — pre-commit (lint-staged → artifact regeneration →
  affected typecheck), pre-push, the CI matrix (lint/typecheck/test/build),
  knowledge-freshness + inventory-audit checks, **Lighthouse CI** (accessibility
  assertions incl. `color-contrast` across every public marketing URL), and the
  Vercel build. **Every GitHub gate green before a push counts as done.**

## Authority on conflict

The pack does not outrank repository policy. Where they disagree, policy wins and
the deviation is **stated in the plan** — never applied silently, never resolved in
the pack's favour. See [ADR-055](../docs/13-adr/adr-055-canonical-ai-authority-hierarchy.md).
