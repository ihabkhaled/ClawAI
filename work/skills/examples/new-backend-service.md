# Example: Adding a new backend service

Reference case: `claw-agent-service` (shipped 2026-04-18, commits `8ff618e` through `a54efb6`).

## Skills fired

| Phase    | Skills                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0  | `foundations/product-awareness`, `foundations/requirement-validation`, `architecture-planning/feature-planning` (large), `architecture-planning/architecture-review`             |
| Schema   | `architecture-planning/migration-planning`                                                                                                                                       |
| Backend  | `backend/module-design`, `backend/layer-boundaries`, `backend/dto-design`, `backend/error-handling`, `backend/observability`, `backend/rabbitmq-events`, `backend/audit-logging` |
| Security | `security/input-validation`, `security/auth-authz-review`, `security/secret-handling` (sessionKey never returned in list responses)                                              |
| Testing  | `testing/tdd-workflow`, `testing/unit-testing`, `testing/coverage-strategy`, `e2e-manual-testing/manual-api-testing`                                                             |
| Frontend | `frontend/page-planning`, `frontend/data-fetching`, `frontend/loading-empty-error-states`, `frontend/i18n`                                                                       |
| Infra    | `CLAUDE.md` "How to Add a New Backend Service" — 7 compose files, nginx, health, shared-constants, shared-types, CI, env, frontend                                               |
| Docs     | `documentation/technical-documentation`, `documentation/pr-descriptions`                                                                                                         |
| Gates    | All `quality-gates/*`                                                                                                                                                            |

## Critical lessons

1. **Dual auth** — user endpoints via JWT `AuthGuard`; agent endpoints via `AgentKeyGuard`. Don't mix the guards on the same controller.
2. **sessionKey security** — returned ONCE at registration; stripped from every list/detail response via repository-layer destructuring.
3. **Prisma omit + include incompatibility** — can't combine in 5.22; use manual destructure.
4. **nginx config reload** — mounting the file isn't enough; `docker compose restart nginx` or the old config is served.
5. **QA script** — 59/59 assertions covering auth, CRUD, DB verification, Docker logs. File: `qa/test-agent-service.sh`.

## Commit chunks

Six logical commits (schema → shared-types → infra → service → frontend → docs + CLAUDE.md). Each stood on its own, each passed pre-commit hooks green.

## Gates satisfied

- Code quality: 0 lint / 0 typecheck / build green
- Coverage: critical paths (dispatch, approval, heartbeat) ≥98%
- Manual API: 59/59 QA assertions, DB verified, Docker logs clean
- Docs: service-guide-agent.md + services-index.md updated + CLAUDE.md updated
- Release readiness: all of the above = green
