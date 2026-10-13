# ClawAI — Commit and PR Rules

---

## Landing a change

Commit and push through the hooks; they run the gates the change type needs,
scoped to what changed, and CI runs the rest. Run nothing else by hand, and never
re-run a gate the hooks are about to run on the same tree. The canonical text —
the landing loop, what each hook runs, and the gate matrix by change type — is
[rules/23](23-git-commits-hooks-and-release-gates.md#landing-a-change).
`--no-verify` and every other bypass are banned
([ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md)).

## Push each commit before starting the next one (MANDATORY)

**One commit, one push. Never build a local stack of unpushed commits.**

### Flagship and gigantic features must ship as pushed checkpoints

For a flagship, multi-surface, or otherwise gigantic feature, divide the work
into independently testable vertical checkpoints before implementation starts.
Each checkpoint must complete its scoped tests, commit, and push before coding
continues on the next checkpoint. A large feature is never permission to keep a
large local commit stack; it is a stronger reason to land smaller remote-backed
increments so CI, reviewers, and collaborators can validate the work while it
is still easy to isolate.

After every `git commit` that passes its hook, the very next git command is
`git push`. Do not stage the next change, do not start the next task, until the
commit you just made is on the remote.

Why this is a rule and not a preference:

- **CI only sees what is pushed.** A stack of five local commits is five
  unverified commits. The first one may already have broken the build, and you
  will not find out until the whole stack lands — at which point the bisect
  surface is five commits wide instead of one.
- **Unpushed work is unbacked-up work.** A local-only commit exists on exactly
  one disk.
- **A red push is cheap to fix in isolation.** Pushing commit N before writing
  commit N+1 means a failure is attributable to one change, and the fix is a
  follow-up commit rather than an interactive rebase through work that has since
  been built on top of it.
- **Reviewers and collaborators cannot see local commits.** Long-lived local
  stacks are how two people silently diverge on the same files.

The sequence for a multi-commit task is therefore:

```bash
# commit 1
git add <explicit paths>
git commit -m "…"
git push origin <branch>          # ← before anything else

# commit 2 — only now
git add <explicit paths>
git commit -m "…"
git push origin <branch>
```

If a push is rejected (`non-fast-forward`), integrate and push again before
continuing — never continue committing on top of a branch you could not push.

The one exception is an explicit instruction not to push (a spike, an
experiment, a review-locally-first request). That instruction has to come from
the user; it is never the default and never inferred.

**Never use `--no-verify`** (nor `-c core.hooksPath=/dev/null` or any other bypass). The hook is scoped and fast; a failure in it is a real problem in something you staged — fix it, don't skip it. The only exception is a documented incident procedure with explicit human sign-off (see `docs/exceptions/README.md`).

**Hard limits (never violate):**

- NEVER skip a gate for a folder you changed.
- NEVER bypass the pre-commit / pre-push hook with `--no-verify` (or any equivalent).
- NEVER expand to the all-workspace gate after the touched-folder gates pass.
- Docs-only changes (`docs/**`, `CLAUDE.md`, `CODEX.md`, `cursor.md`, `rules/**`, locale files paired with `i18n.types.ts`) still run the (fast) hook and stay conventional-commit format.

---

## Conventional Commits Format

```
<type>(<scope>): <subject>

<body — WHY, not WHAT>

<footer>
```

**Types**: `feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`

**Subject**: max 100 chars, lowercase, no period at end, no PascalCase, no UPPER_CASE

**Body**: Explain WHY the change was needed. The diff shows WHAT changed.

**Footer**: a `Docs:` trailer on every commit — `Docs: updated <what>` or
`Docs: none — <specific reason>` ([rules/63](63-docs-move-with-code.md)) — then
`Co-Authored-By: <AI-name> <noreply@...>` for agent-authored commits.

Examples:

```
feat(connector): add Ollama cloud catalog sync

Connector sync was limited to locally installed models. Users couldn't
discover or select cloud Ollama models without knowing model names.
Now syncs 200+ models from ollama.com catalog.

Docs: updated apps/claw-connector-service/CLAUDE.md, docs/04-backend/service-guide-connector.md
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
fix(chat): route OLLAMA connector provider to callOllama()

Provider comparison only checked 'local-ollama'. Connectors created
with provider=OLLAMA (uppercase) fell through to cloud provider call,
which failed silently and triggered local fallback with wrong model.

Docs: none — a routing bug fix; no document described the broken comparison
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Commit Chunking

Chunk commits by logical boundary, not by time:

```
Commit 1: schema migration (Prisma change)
Commit 2: backend implementation (service, manager, controller, DTO)
Commit 3: events (shared-types, publisher, consumer)
Commit 4: frontend implementation (types, hooks, components, page, i18n)
Commit 5: infrastructure (env, docker, nginx, CI)
Commit 6: tests (unit, QA script)
Commit 7: docs (CLAUDE.md, docs/ files)
```

---

## What the hooks run

pre-commit: lint-staged (ESLint `--max-warnings 0`, Prettier) → secret scan →
knowledge layer regenerate + verify (including the docs checks) → root checks +
typecheck of the staged-affected workspaces. commit-msg: commitlint and the
`Docs:` trailer check. pre-push: every pushed ref's tree — knowledge, root
checks, typecheck of shared-package dependents, related tests, build. Details:
[rules/23](23-git-commits-hooks-and-release-gates.md#what-the-hooks-run).

A hook failure is a real problem in what you staged: fix it and make a new
commit — never `--amend` to paper over it, never bypass it.

## Branch Rules

- Primary branch: `main`
- Feature branches: `feat/<feature-name>`
- Fix branches: `fix/<issue-description>`
- Never force-push to `main` without explicit user approval
- Delete branches after merge

---

## PR Rules

PR title = conventional commit subject line.

PR body must include:

```markdown
## Summary

- What changed (3 bullets max)

## Test evidence

- Unit tests: X passing
- API QA: X/Y passing (link to qa/ script)
- Manual UI: tested loading/empty/error/success states

## Checklist

- [ ] All 18 infra items verified
- [ ] QA script run with 0 failures

## Docs impact

- Updated: <docs> — or: none, because <specific reason> (rules/63)
```

The canonical PR template is [`.github/pull_request_template.md`](../.github/pull_request_template.md).

---

## What Never Goes in a Commit

- TypeScript errors
- ESLint errors
- Commented-out code blocks
- `console.log` statements
- `eslint-disable` comments
- `@ts-ignore` or `@ts-expect-error` comments
- TODO comments that aren't tracked issues
- Hardcoded secrets (API keys, passwords, tokens)
- Inline types/enums/consts in restricted files

## Generated artifacts are a hard gate

`.ai/**`, every workspace `AGENTS.md`, the per-model routers and the inventory
snapshot are generated; the pre-commit hook regenerates and stages them, and CI
fails on a stale one. The rule, the fix for a red CI and the ordering trap live in
one place: [rules/24](24-generated-files-and-knowledge-freshness.md#generated-artifacts-are-a-hard-gate-never-optional).

## Enforcement

- **Git hook** — `.husky/commit-msg` runs commitlint and `docs:impact` on every message;
  `.husky/pre-commit` and `.husky/pre-push` gate the content.
- **Knowledge check** — `npm run knowledge:verify` (`checkBypass`) fails if any
  canonical policy file recommends bypassing a hook.
- **Review checklist** — an unpushed commit stack is rejected: one commit, one push.

## Definition of done

- [ ] The message is a valid conventional commit.
- [ ] Only explicit paths were staged — never `-A`, never `.`.
- [ ] The commit was pushed before the next one started.
