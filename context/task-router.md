# Task Router

Maps a **kind of task** to the rules to read, skills to use, reviewers to
involve, and the validation lane to run. This mirrors the machine-driven
`.ai/packs/` bundles: `npm run knowledge:context -- --task="…"` classifies your
task into one of these and writes `.ai/local/current-context.md`. Use this table
when you want the mapping without running the resolver, or to understand what the
resolver produced.

## How to use

```bash
npm run knowledge:context -- --task="<what you are doing>"
# then read .ai/local/current-context.md — it lists affected workspaces,
# governing rules, matching skills, reviewers, related events/permissions/env,
# and known pitfalls, then follow the rules it cites.
```

The packs live in `.ai/packs/*.md` (generated). The 11 canonical task kinds:

## Task packs

| Pack                        | Trigger                                              | Primary workspace(s)                         | Read rules              | Use skills                    | Reviewers                            | Validation lane                                                           |
| --------------------------- | ---------------------------------------------------- | -------------------------------------------- | ----------------------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| **billing-payments**        | billing, subscriptions, refunds, invoices, prices    | auth, payment, frontend                      | 02, 04, 08, 17, 28      | payment flow, reconcile, jobs | API, security, data, reliability     | per-folder gates on auth, payment, and frontend                           |
| **authentication-security** | auth, identity, sessions, permissions, JWT, RBAC     | claw-auth-service, `shared-auth`             | 02-backend, 08-security | 02-service-scaffold, 04-debug | auth reviewer, security              | per-folder gates on auth-service                                          |
| **rabbitmq-event**          | event, publish, consume, queue, dlq, exchange        | `shared-types`, producer + consumer services | 02-backend, 04-testing  | 08-event-bus-toolkit          | rabbitmq-event-reviewer, reliability | `cd packages/shared-types && npm run typecheck` + `npm run affected:test` |
| **database-migration**      | prisma, schema, migration, model, column             | the owning service only                      | 02-backend, 05-infra    | 07-database-toolkit           | data reviewer                        | per-folder gates + `migrate:dev` on the service                           |
| **chat-streaming**          | chat SSE, stream, token, reasoning delta             | claw-chat-service                            | 02-backend, 04-testing  | 04-debug, 08-event-bus        | streaming reviewer                   | per-folder gates on chat-service                                          |
| **ai-provider-connector**   | connector, provider adapter, OpenAI/Anthropic/Gemini | claw-connector-service                       | 02-backend              | 02-service-scaffold           | connector reviewer                   | per-folder gates on connector-service                                     |
| **model-routing**           | routing decision, policy, mode, router               | claw-routing-service                         | 02-backend, 04-testing  | 04-debug                      | routing reviewer                     | per-folder gates on routing-service                                       |
| **frontend-feature**        | Next.js page, component, hook, i18n                  | claw-frontend                                | 03-frontend, 04-testing | 03-feature-scaffold           | frontend reviewer, a11y              | per-folder gates on claw-frontend (+ i18n ×13)                            |
| **workspace-connector**     | workspace connector, OAuth, sync, webhook            | claw-workspace-service                       | 02-backend, 08-security | 02-service-scaffold           | workspace reviewer, security         | per-folder gates on workspace-service                                     |
| **infrastructure**          | docker, nginx, env, port, compose, CI                | `infra/`, `docker/`, `scripts/`, ci.yml      | 05-infra                | 06-docker-toolkit             | infra reviewer                       | `node --check` / compose validate + 18-item infra checklist               |
| **documentation**           | docs, governance, README, CLAUDE.md                  | `docs/`, `context/`, `rules/`                | 06-docs                 | —                             | docs reviewer                        | `npm run knowledge:verify` (docs:check)                                   |

Reviewer roles are defined under `agents/`. Rules are `rules/0N-*.md`; skills are
`skills/0N-*.md`.

## Universal lane (every task)

Regardless of pack, before committing run the per-folder gates on the folders you
touched (see [stack-and-toolchain.md](stack-and-toolchain.md)):

```bash
cd <touched-workspace>
npm run typecheck && npm run lint && npm test && npm run build
```

And before release: `npm run release:preflight`.

## Cross-cutting reminders by pack

- **billing-payments** — use `skills/add-a-payment-gateway-flow.md`,
  `skills/reconcile-billing-state.md`, or
  `skills/debug-a-stuck-scheduled-job.md` as appropriate. Preserve immutable
  financial records, use integer units, keep internal contracts private, and
  test exact serialized frontend request bodies.
  ([rules/28-billing-integrity-and-api-contracts.md](../rules/28-billing-integrity-and-api-contracts.md))
- **rabbitmq-event** — add the pattern to `packages/shared-types` **first**;
  every producer needs a documented consumer; never swallow handler errors.
  ([event-flow-map.md](event-flow-map.md))
- **database-migration** — never cross a DB boundary; schema change → container
  rebuild. ([database-ownership-map.md](database-ownership-map.md))
- **frontend-feature** — new user-facing text → all 13 locales + `i18n.types.ts`
  in the same change. ([frontend-architecture.md](frontend-architecture.md))
- **infrastructure** — a new env var or service must propagate to every compose
  file, installer, nginx, CI, and shared-constants.
  ([environment-ownership-map.md](environment-ownership-map.md))
