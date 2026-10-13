# 00 — Non-Negotiable Rules

## Purpose

These are the hard blockers. Each one, alone, fails review and blocks delivery
regardless of how good the rest of the change is. They sit at the top of the
authority order together with [`AGENTS.md`](../AGENTS.md), the canonical router
([ADR-170](../docs/13-adr/adr-170-agents-md-is-the-canonical-router.md)). There is no
situational bypass. If you think you have found one, you have found a bug in the
change, not an exception to the rule.

## Applies to

Every workspace — every `apps/claw-*` service, `apps/claw-frontend`, every
`packages/shared-*` — and every script, config, workflow and doc in the repo.

## Mandatory rules

1. **Run knowledge context first.** Before any change, run
   `npm run knowledge:context -- --task="…"` and read `.ai/local/current-context.md`.
2. **A test for every change.** New/changed behavior ships with a new/changed
   Vitest test. Coverage may not drop below the per-workspace floor.
3. **i18n for all user-facing text.** Every string a user can see is rendered via
   `t('key')` and exists in all 13 locale files (`en, ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh`).
4. **TSX = render only.** `.tsx` files contain component render composition and a
   single controller hook — no business logic, no inline hooks/types/consts.
5. **Land through the hooks.** Commit and push; the hooks run the gates the change
   type needs, scoped to what changed, and CI runs the rest
   ([rules/23](23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type)).
   Never run all-workspace gates for a scoped change, and never re-run a gate
   already proven green over the same tree.
6. **Strict equality only** — `===` / `!==`, never `==` / `!=`.
7. **No `process.env` outside AppConfig** — read config through the Zod-validated
   `AppConfig` provider.
8. **No `console.log`** — backend uses NestJS `Logger`; frontend uses the logger
   utility. Only `console.warn` / `console.error`, and only where already tolerated.
9. **No cross-DB access.** A service touches only its own database. Reach other
   data via HTTP or a RabbitMQ event on `claw.events` — never another service's DB.
10. **No business logic in controllers.** Controllers extract params, call one
    service method, return. No `try/catch`, no `throw`, no branching logic.
11. **No DB calls outside repositories.** Prisma/Mongoose calls live only in
    `*.repository.ts`. Services and managers call repositories, never the client.
12. **No secret logging or exposure.** Never log or return tokens, passwords,
    refresh tokens, API keys, or encrypted config to any client or log sink.
13. **Every change carries its knowledge delta.** A change is the code _plus_ the
    knowledge that lets the next agent act on it in seconds. In the same commit,
    update whichever apply: the service's `CLAUDE.md`, its service guide, the
    governing `rules/*.md`, the matching `skills/*.md`, the relevant `context/*.md`,
    and the regenerated `.ai/**`. A repeatable new procedure gets a skill; a new
    constraint gets a rule; both must be reachable from their index. Record the
    _why_, the rejected alternatives, and the operational consequence — see
    [33-knowledge-compounding-and-context-velocity.md](33-knowledge-compounding-and-context-velocity.md).
14. **The QA team walk, with evidence.** No change is done until you have been
    every QA hat over it — manual, API, UI, UX, responsive (≥3 widths per
    platform, both orientations, plus RTL), UAT, regression, RBAC across roles
    _and_ plan tiers, security, performance, stress — and every claim in the
    report carries real evidence: the exact command and its output, a screenshot
    per breakpoint, the log line proving the branch ran. A lane you could not run
    is reported as not run; a result you did not observe is never written. See
    [49-qa-team-discipline-and-test-evidence.md](49-qa-team-discipline-and-test-evidence.md)
    and the record [rules/60](60-qa-evidence-is-mandatory-and-machine-checked.md) requires.
15. **Docs move with code.** Every document that describes what a change touches
    is accurate in the same commit, and the commit carries a `Docs:` trailer —
    `Docs: updated <what>` or `Docs: none — <specific reason>`. The hooks and CI
    reject stale references, hand-written counts, copied sections and a missing or
    bare trailer ([rules/63](63-docs-move-with-code.md)).
16. **Chat surfaces are one pipeline.** A change to normal chat reaches Compare,
    Consensus, Escalation, the labs and the judge through shared code
    ([rules/59](59-chat-surfaces-are-one-pipeline.md)).

## Prohibited patterns

- `--no-verify` or any git-hook bypass to land a change.
- Leaving a commit unpushed while starting the next one. One commit, one push:
  CI only sees what is pushed, so a local stack is a stack of unverified commits.
- `eslint-disable` / `eslint-disable-next-line` to silence a real finding.
- `@ts-ignore`, or `@ts-expect-error` without an approved waiver.
- `any`, or `as unknown as X` casts.
- String-literal union types for domain values (use an enum).
- Shipping a feature, flagship or migration with **zero** diff under `rules/`,
  `skills/`, `docs/`, `context/` or `.ai/` — and no stated reason why none applied.
- "I'll document it in a follow-up." The follow-up does not happen.
- A new `rules/*.md` or `skills/*.md` that no index references.
- Hand-editing anything under `.ai/**` or the inventory snapshot.
- "Tested and working" with nothing behind it — and reporting a check, a
  screenshot, a number or a lane you did not actually run.

## Correct pattern

```bash
# The routine loop for any change:
npm run knowledge:context -- --task="add criticModel to compare DTO"
# … implement inside apps/claw-chat-service only, with its tests and docs …
git add <explicit paths>
git commit   # hooks: lint, secret scan, knowledge + docs checks, typecheck; Docs: trailer
git push     # hooks: related tests, build; then CI
```

## Enforcement

- 1, 5 → **Git hooks** (`.husky/*`, `tools/gates/*`) + **CI** (`CI success`).
- 2 → **Unit test** + **CI job** (coverage floor, changed-lines coverage, rules/22).
- 3 → **Knowledge check** (`.ai/manifests/i18n.json`) + **Unit test** (i18n audit).
- 4, 6, 8, 10, 11 → **ESLint** (`no-restricted-syntax`, `no-console`, `eqeqeq`).
- 7 → **ESLint** + **Review checklist**.
- 9 → **Architecture test** + **Review checklist**.
- 12 → **ESLint** (Pino redaction config) + **Review checklist**.
- Prohibited casts/unions → **ESLint** + **TS config** (`npm run typecheck`).
- 13 → **Knowledge check** (`npm run knowledge:coverage`, CI + unit suite — kept
  out of the hooks so the commit path stays fast) + **Review checklist**.
- 14 → **CI job** (`qa-evidence`, rules/60) + **Review checklist**.
- 15 → **commit-msg hook** (`docs:impact`) + **knowledge:verify** (`docs:refs`,
  counts, duplication) in the hooks and CI.
- 16 → **Unit tests** named in rules/59 + **Review checklist**.

## Related skills

- [04-debug-toolkit](../skills/04-debug-toolkit.md) — verify logs/DB before guessing.
- [05-qa-toolkit](../skills/05-qa-toolkit.md) — the QA script bar.
- [run-the-qa-team](../skills/run-the-qa-team.md) — every QA hat over a change, and the evidence each one produces.

## Related context

- [`AGENTS.md`](../AGENTS.md) — the canonical router and its prohibition list.
- `.ai/BOOTSTRAP.md`, `.ai/manifests/governance.json`.

## Definition of done

- [ ] `knowledge:context` was run and its output read before coding.
- [ ] Every blocker above is provably satisfied for the diff.
- [ ] Landed through the hooks with a valid `Docs:` trailer; no `--no-verify`.
- [ ] Every commit pushed before the next was started —
      `git log --oneline origin/<branch>..HEAD` is empty.
- [ ] No prohibited pattern present anywhere in the diff.
- [ ] The knowledge delta landed in the same commit, and `npm run knowledge:coverage` passes.
- [ ] The QA team walk was done against the running stack and every claim in the
      report has its evidence line; any lane that could not run is named as unproven.
