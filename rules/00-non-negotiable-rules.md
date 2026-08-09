# 00 — Non-Negotiable Rules

## Purpose

These are the hard blockers. Each one, alone, fails review and blocks delivery
regardless of how good the rest of the change is. They are tier 2 in the
[authority hierarchy](README.md) — only `CLAUDE.md` outranks them. There is no
situational bypass. If you think you have found one, you have found a bug in the
change, not an exception to the rule.

## Applies to

Every workspace: all 17 `apps/claw-*` services, `apps/claw-frontend`, all six
`packages/shared-*`, and every script/config file in the repo.

## Mandatory rules

1. **Run knowledge context first.** Before any change, run
   `npm run knowledge:context -- --task="…"` and read `.ai/local/current-context.md`.
2. **A test for every change.** New/changed behavior ships with a new/changed
   Jest or Vitest test. Coverage may not drop below the per-workspace floor.
3. **i18n for all user-facing text.** Every string a user can see is rendered via
   `t('key')` and exists in all 13 locale files (`en, ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh`).
4. **TSX = render only.** `.tsx` files contain component render composition and a
   single controller hook — no business logic, no inline hooks/types/consts.
5. **Per-folder gates before commit.** Run lint/typecheck/test/build only in the
   folder(s) you touched, never all-workspace. Green → commit.
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

## Prohibited patterns

- `--no-verify` or any git-hook bypass to land a change.
- Leaving a commit unpushed while starting the next one. One commit, one push:
  CI only sees what is pushed, so a local stack is a stack of unverified commits.
- `eslint-disable` / `eslint-disable-next-line` to silence a real finding.
- `@ts-ignore`, or `@ts-expect-error` without an approved waiver.
- `any`, or `as unknown as X` casts.
- String-literal union types for domain values (use an enum).

## Correct pattern

```bash
# The routine loop for any change, before you write code and before you commit:
npm run knowledge:context -- --task="add criticModel to compare DTO"
# … implement inside apps/claw-chat-service only …
cd apps/claw-chat-service
npx tsgo --noEmit && npm run lint && npm test && npm run build   # per-folder gate
```

## Enforcement

- 1, 5 → **Git hook** + **Knowledge check** (`npm run knowledge:check`).
- 2 → **Unit test** + **CI job** (coverage threshold).
- 3 → **Knowledge check** (`.ai/manifests/i18n.json`) + **Unit test** (i18n audit).
- 4, 6, 8, 10, 11 → **ESLint** (`no-restricted-syntax`, `no-console`, `eqeqeq`).
- 7 → **ESLint** + **Review checklist**.
- 9 → **Architecture test** + **Review checklist**.
- 12 → **ESLint** (Pino redaction config) + **Review checklist**.
- Prohibited casts/unions → **ESLint** + **TS config** (`tsgo --noEmit`).

## Related skills

- [04-debug-toolkit](../skills/04-debug-toolkit.md) — verify logs/DB before guessing.
- [05-qa-toolkit](../skills/05-qa-toolkit.md) — the QA script bar.

## Related context

- Root `CLAUDE.md` — "Universal Code Rules" and "Absolute Blockers."
- `.ai/BOOTSTRAP.md`, `.ai/manifests/governance.json`.

## Definition of done

- [ ] `knowledge:context` was run and its output read before coding.
- [ ] Every blocker above is provably satisfied for the diff.
- [ ] Per-folder gates green; no `--no-verify` used to hide a failure.
- [ ] Every commit pushed before the next was started —
      `git log --oneline origin/<branch>..HEAD` is empty.
- [ ] No prohibited pattern present anywhere in the diff.
