# ClawAI — Claude Code notes

**Start at [`AGENTS.md`](AGENTS.md).** It is the canonical router for every agent:
identity, authority order, first command, how a change lands, the absolute
prohibitions and where everything lives. This file adds only what is specific to
working in Claude Code, plus a compact index
([ADR-170](docs/13-adr/adr-170-agents-md-is-the-canonical-router.md)).

> **Before you finish any change, update every doc it makes stale (rule 63). The hooks will reject it otherwise.**
>
> **Testing is not optional.** Before any change is called done, walk all 15 QA lanes
> and record them in `docs/qa-evidence/<date>-<slug>.md` (`npm run qa:evidence:new`).
> CI rejects a feat/fix push without a valid record. Read
> [`QA-WORKFLOW.md`](QA-WORKFLOW.md) and
> [rules/60](rules/60-qa-evidence-is-mandatory-and-machine-checked.md) first.

> **Akinator runs on every change, with no command ([rule 65](rules/65-akinator-runs-on-every-change.md)).** The plugin is optional: the in-repo
> [`skills/akinator/SKILL.md`](skills/akinator/SKILL.md) is the source. A new flagship or big feature ships its public marketing page in the
> same change ([rule 66](rules/66-every-flagship-feature-ships-a-public-marketing-page.md)).

## Read order for a task

1. `npm run knowledge:context -- --task="<task>"`, then `.ai/local/current-context.md`.
2. [`rules/00-non-negotiable-rules.md`](rules/00-non-negotiable-rules.md).
3. The rules and skills the context file names; the touched workspace's own
   `CLAUDE.md` and generated `AGENTS.md`.
4. Work arriving as a document (prompt pack, plan, brief):
   [rules/26](rules/26-prompt-pack-intake-protocol.md) before any code.

## Working in Claude Code

- **Land through the hooks.** `git add <explicit paths>` → `git commit` → `git push`.
  The hooks gate the change for its type
  ([rules/23 gate matrix](rules/23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type));
  do not pre-run the same gates by hand. Every commit carries a `Docs:` trailer
  ([rules/63](rules/63-docs-move-with-code.md)).
- **A push whose pre-push runs for minutes can lose its connection** and exit 141
  after printing `pre-push OK`. Run `npm run gates:receipt` first: it proves the
  tree once and the push then skips those gates. Always check the push's real exit
  code and `git log origin/<branch>..HEAD`, never a summary.
- **Background only long jobs**, announce them in one line, and read their real
  exit code. Never edit files that a running hook or test run is reading.
- **Subagents**: foreground by default, each with a stated scope and explicit file
  ownership ([rules/48](rules/48-lint-and-test-only-what-changed.md) item 10). Small
  work: at most two at once. Large work: hire as many as there are independent parts,
  split big parts into sub-agents, one owner per shared file (locales, adr-index,
  package.json and lockfile, generated files), agents never run git, and the lead
  integrates, gates and commits in batches. Agents editing one tree without ownership
  contaminate each other's gates.
- **Subagent models, every agent and tool** ([rules/64](rules/64-subagent-model-selection.md),
  [skill](skills/choose-the-subagent-model.md)): **Haiku 5.5** for read-only work
  (audit, read, gain context); the main model (or `sonnet`/`opus`) for writing code
  and for Playwright, manual, API and automation QA, never Haiku there; gates climb
  Haiku 5.5 → Sonnet 5.5 → Sonnet 5.5 high effort → Opus 5.5 low/medium effort, only on
  a real failure; never Fable-class models or `xhigh`/`max` effort as subagents;
  unsure or confused: ask the owner (`<Model X> at <effort> failed on <gate>: <error>.
Try <Model Y> at <effort Z>?`).
- **Fresh worktree**: `npm ci`, then `npm run affected:shared-build` and
  `npm run prisma:generate --workspaces --if-present` before trusting a gate.
  Never commit while a background agent writes in the same tree.
- **Never** `--no-verify` or any other hook bypass
  ([ADR-061](docs/13-adr/adr-061-git-hook-policy-no-bypass.md)).

## Per-workspace rules still apply

Each workspace carries its own `CLAUDE.md` and a generated `AGENTS.md` with
service-local constraints (chat-service's token-deduction chokepoint,
payment-service's card-data rules, llamacpp's Debian requirement, …). Read the one
for the workspace you touch.

## Index

- **Blockers:** [rules/00-non-negotiable-rules.md](rules/00-non-negotiable-rules.md) ·
  rule index [rules/README.md](rules/README.md) ·
  [engineering mindsets](rules/27-engineering-mindsets.md)
- **Subagent models:** [rules/64](rules/64-subagent-model-selection.md) ·
  [skills/choose-the-subagent-model.md](skills/choose-the-subagent-model.md) ·
  [context/subagent-model-ladder.md](context/subagent-model-ladder.md)
- **Landing a change, hooks, CI:** [rules/23](rules/23-git-commits-hooks-and-release-gates.md) ·
  [rules/34](rules/34-gate-economy-and-machine-resources.md) ·
  [rules/48](rules/48-lint-and-test-only-what-changed.md) ·
  [CI pipeline](docs/08-runtime-devops/ci-cd-pipeline.md)
- **Always-on passes:** [rules/65 Akinator](rules/65-akinator-runs-on-every-change.md) · [skills/akinator](skills/akinator/SKILL.md) ·
  [where it triggers](context/akinator-always-on.md) · [rules/66 marketing page](rules/66-every-flagship-feature-ships-a-public-marketing-page.md) ·
  [skill](skills/ship-a-feature-marketing-page.md)
- **Docs and knowledge:** [rules/63](rules/63-docs-move-with-code.md) ·
  [rules/33](rules/33-knowledge-compounding-and-context-velocity.md) ·
  [rules/24](rules/24-generated-files-and-knowledge-freshness.md) ·
  [skills/grow-the-knowledge-layer.md](skills/grow-the-knowledge-layer.md)
- **QA and testing:** [QA-WORKFLOW.md](QA-WORKFLOW.md) ·
  [rules/60](rules/60-qa-evidence-is-mandatory-and-machine-checked.md) ·
  [rules/49](rules/49-qa-team-discipline-and-test-evidence.md) ·
  [rules/44](rules/44-live-verification-before-done.md) ·
  [rules/22 coverage](rules/22-testing-and-coverage.md) ·
  [skills/run-the-qa-team.md](skills/run-the-qa-team.md)
- **Planning:** [rules/01-planning-rules.md](rules/01-planning-rules.md) ·
  [rules/01-task-intake-and-planning.md](rules/01-task-intake-and-planning.md)
- **Backend layering:** [rules/02](rules/02-backend-rules.md), [rules/07](rules/07-backend-controllers-and-transport.md)–[rules/11](rules/11-dtos-and-validation.md) ·
  declarations [rules/12](rules/12-types-enums-constants-and-declaration-ownership.md) ·
  library wrappers [rules/13](rules/13-external-library-wrappers-and-adapters.md) ·
  shared packages [rules/14](rules/14-shared-packages.md)
- **Frontend:** [rules/03](rules/03-frontend-rules.md), [rules/04](rules/04-nextjs-app-router.md)–[rules/06](rules/06-frontend-queries-and-cache.md) ·
  bundle weight [rules/47](rules/47-client-bundle-weight-and-barrel-boundaries.md)
- **Chat:** every surface shares one pipeline — [rules/59](rules/59-chat-surfaces-are-one-pipeline.md) ·
  [parity map](context/chat-surface-parity-map.md) ·
  [skill](skills/propagate-a-chat-change-to-every-mode.md)
- **Config, auth, events:** [rules/15](rules/15-configuration-and-environment.md) ·
  [rules/16](rules/16-authentication-and-authorization.md) ·
  [rules/17](rules/17-rabbitmq-events-and-jobs.md) ·
  [env vars](docs/06-data/environment-variables.md)
- **Errors, logging, i18n, security:** [rules/18](rules/18-error-handling-and-reliability.md) ·
  [rules/19](rules/19-logging-observability-and-redaction.md) ·
  [rules/20](rules/20-i18n-and-user-facing-messages.md) ·
  [rules/08](rules/08-security-rules.md) · [rules/21](rules/21-security-and-secrets.md)
- **Money:** [rules/28](rules/28-billing-integrity-and-api-contracts.md) ·
  [billing threat model](docs/03-architecture/billing-threat-model.md) ·
  [plan numbers](docs/business/README.md) ·
  display vs settlement currency [rules/45](rules/45-display-currency-versus-settlement-currency.md) ·
  token quotas [rules/46](rules/46-token-quota-enforcement-and-window-integrity.md)
- **Attachments, login, research, routing:**
  [rules/42](rules/42-attachment-understanding.md) ·
  [rules/43](rules/43-account-state-disclosure-and-transactional-email.md) ·
  [rules/50](rules/50-agentic-research-loop-and-narration.md) ·
  [rules/51](rules/51-router-candidates-and-model-window-fit.md)
- **Infra delivery checklist** (env, installers, every compose file, nginx, health,
  CI, TLS, i18n, migrations, seeds): [rules/05](rules/05-infra-rules.md) ·
  **a new service, every place incl. the production `.env`:**
  [skills/add-a-new-service.md](skills/add-a-new-service.md) ·
  [env ownership](context/environment-ownership-map.md)
- **Refactors, exceptions, AdSense, worktree PRs:** [rules/09](rules/09-refactor-rules.md) ·
  [rules/25](rules/25-exceptions-and-waivers.md) ·
  [rules/38](rules/38-adsense-eligibility-and-low-value-content.md) ·
  [rules/39](rules/39-worktree-branch-completion-pr-and-release-notes.md)
- **Maps:** [architecture](context/architecture-map.md) ·
  [services](context/service-catalog.md) · [workspaces](context/workspace-map.md) ·
  [ports](context/port-and-service-map.md) · [permissions](context/permission-map.md) ·
  [events](context/event-flow-map.md) · [databases](context/database-ownership-map.md) ·
  [codebase navigation](context/codebase-navigation.md) · [task router](context/task-router.md) ·
  [load-bearing facts](context/load-bearing-facts.md)
- **Architecture docs:** [data flow](docs/03-architecture/end-to-end-data-flow.md) ·
  [routing engine](docs/03-architecture/routing-engine.md) ·
  [model catalog](docs/03-architecture/model-catalog-architecture.md) ·
  [runtime progress](docs/03-architecture/runtime-progress.md) ·
  [metrics](docs/08-runtime-devops/metrics-and-dashboards.md) ·
  [nginx](docs/08-runtime-devops/nginx-reference.md) ·
  [docker](docs/08-runtime-devops/docker-guide.md) ·
  [build system](docs/08-runtime-devops/build-system.md) ·
  [TLS](docs/08-runtime-devops/tls-setup.md)
- **Product:** [vision](docs/01-executive-context/product-vision.md) ·
  [flagships](docs/02-business-product/flagship-features.md) ·
  [Threads spec](docs/02-business-product/clawai-threads-product-spec.md)
- **Decisions and runbooks:** [ADR index](docs/13-adr/adr-index.md) ·
  [runbooks](docs/11-runbooks/README.md) · [skills index](skills/00-index.md)
- **Per service:** `docs/04-backend/service-guide-<name>.md` · `apps/claw-<name>/CLAUDE.md`

## Honest status

Where something is partially built, the docs say so. Report the same way: a
skipped step is reported as skipped, a failing test with its output. "Done" means
gated, committed, pushed and CI green.

## Communication style (mandatory)

Short, plain, concrete — a few lines. `Blocked: <the actual thing>.` when blocked;
`Working — <what>.` while working. Name the file, symbol or exact error. Stay in
the foreground and show every step as it happens — each file changed, patch
applied (or failed), command run with its result, test count and retry — one line
each, never batched into a final report
([rules/29](rules/29-communication-style.md) ·
[skills/communicate-briefly](skills/communicate-briefly.md)).
