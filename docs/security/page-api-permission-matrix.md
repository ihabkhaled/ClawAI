# Page / API Permission Matrix

Authoritative classification of every frontend route and backend endpoint group
for the RBAC flagship. "Normal user" = the `USER` system role (MEMBER). Backend
is the source of truth; frontend gating is UX. Permissions are the centralized
catalog in `packages/shared-types/src/enums/permission.enum.ts` (mirrored in
`apps/claw-frontend/src/enums/permission.enum.ts`).

Legend: ✅ allowed · ❌ blocked (hidden + 403). All ❌ pages are hidden from the
sidebar by the recursive permission filter and blocked by the route guard
(`AccessDenied`) + backend `@RequirePermissions`.

## Frontend routes

| Route                                                                                          |     Normal user | Required permission                 | Frontend guard          | Sidebar                        |
| ---------------------------------------------------------------------------------------------- | --------------: | ----------------------------------- | ----------------------- | ------------------------------ |
| `/chat`, `/chat/[threadId]`                                                                    |              ✅ | `CHAT_USE` / `CHAT_READ_OWN`        | open                    | shown                          |
| `/chat/compare`                                                                                |              ❌ | `COMPARE_USE`                       | route guard             | hidden                         |
| `/chat/verify`                                                                                 |              ❌ | `JUDGE_USE`                         | route guard             | hidden                         |
| `/chat/{consensus,escalation,repair,decompose,best-of-n,pipeline,cost-ensemble,role-pack}`     |              ❌ | `ROUTER_USE`                        | route guard             | hidden                         |
| `/workspace` (+ all sub-pages: inbox, search, actions, approvals, gmail, jira, slack, docs, …) |              ✅ | `WORKSPACE_*_OWN`                   | open (ownership-scoped) | shown                          |
| `/agent` (+ terminal, repos, capabilities, recipes, marketplace, activity)                     | ✅ (plan-gated) | `AGENT_USE`                         | route guard             | shown                          |
| `/profile`, `/settings` (+devices), `/plan`, `/usage`                                          |              ✅ | account (no gate)                   | open                    | shown                          |
| `/dashboard`                                                                                   |              ❌ | `VIEW_DASHBOARD`                    | route guard             | hidden (USER lands on `/chat`) |
| `/connectors` (+ `/[id]`)                                                                      |              ❌ | `ADMIN_CONNECTORS_MANAGE`           | route guard             | hidden                         |
| `/models` (+ catalog, discovery, local, local-frontier)                                        |              ❌ | `MODELS_CATALOG_VIEW`               | route guard             | hidden                         |
| `/routing` (+ replay, recovery, playground, adaptive-insights, models, decisions)              |              ❌ | `ADMIN_ROUTING_MANAGE`              | route guard             | hidden                         |
| `/memory`                                                                                      |              ❌ | `MEMORY_USE`                        | route guard             | hidden                         |
| `/context`                                                                                     |              ❌ | `CONTEXT_PACK_READ_OWN`             | route guard             | hidden                         |
| `/files`                                                                                       |              ❌ | `FILES_USE`                         | route guard             | hidden                         |
| `/research` (+ runs, providers)                                                                |              ❌ | `RESEARCH_USE`                      | route guard             | hidden                         |
| `/observability`, `/audits`                                                                    |              ❌ | `ADMIN_SYSTEM_VIEW`                 | route guard             | hidden                         |
| `/logs`                                                                                        |              ❌ | `ADMIN_LOGS_VIEW`                   | route guard             | hidden                         |
| `/admin`                                                                                       |              ❌ | `ADMIN_USERS_MANAGE`                | route guard             | hidden                         |
| `/admin/plans`                                                                                 |              ❌ | `ADMIN_PLANS_MANAGE`                | route guard             | hidden                         |
| `/admin/roles`                                                                                 |              ❌ | `ADMIN_PERMISSIONS_MANAGE`          | route guard             | hidden                         |
| `/admin/usage`                                                                                 |              ❌ | `ADMIN_USAGE_VIEW`                  | route guard             | hidden                         |
| `/admin/{ai-action-policies,suggestion-rules}`                                                 |              ❌ | `ADMIN_WORKSPACE_AUTOMATION_MANAGE` | route guard             | hidden                         |
| `/admin/webhook-deliveries`                                                                    |              ❌ | `ADMIN_SYSTEM_VIEW`                 | route guard             | hidden                         |

Map source: `apps/claw-frontend/src/constants/route-permissions.constants.ts` +
`src/utilities/route-permission.utility.ts` (longest-prefix wins). Sidebar
filter: `src/utilities/sidebar-visibility.utility.ts`.

## Backend endpoint groups (`@RequirePermissions` via global `PermissionGuard`)

| Service / controller group                                                              | Normal user | Required permission                                 | Notes                                                                                 |
| --------------------------------------------------------------------------------------- | ----------: | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| connector — CRUD/test/sync/list/detail                                                  |          ❌ | `ADMIN_CONNECTORS_MANAGE`                           | `GET /connectors/:id/models` left OPEN (chat picker)                                  |
| connector — `/internal/*`                                                               |         n/a | `@Public`                                           | service-to-service                                                                    |
| ollama — pull/delete/role-assign/runtime/discovery writes/catalog admin                 |          ❌ | `ADMIN_MODELS_MANAGE`                               | model/catalog/pull-job GET reads OPEN; `/internal/*`, `@Public` generate OPEN         |
| llamacpp — binary/model lifecycle/pull/weights/runtime writes                           |          ❌ | `ADMIN_MODELS_MANAGE`                               | catalog/hardware/models/loaded reads + inference proxy OPEN                           |
| routing — policies, replay, decisions, education, recovery                              |          ❌ | `ADMIN_ROUTING_MANAGE` (+ `@Roles(ADMIN,OPERATOR)`) | router-models mgmt → `ADMIN_MODELS_MANAGE`; `GET /routing/models` OPEN                |
| audit — `GET /audits`, `/audits/:id`, `/audits/stats`                                   |          ❌ | `ADMIN_SYSTEM_VIEW`                                 |                                                                                       |
| audit — `GET /usage*`                                                                   |          ❌ | `ADMIN_USAGE_VIEW`                                  |                                                                                       |
| server-logs — log viewer reads                                                          |          ❌ | `ADMIN_LOGS_VIEW`                                   | log INGESTION stays OPEN                                                              |
| research — runs/fetch/search/search-providers (read)                                    |          ❌ | `RESEARCH_USE`                                      |                                                                                       |
| research — search-provider writes                                                       |          ❌ | `ADMIN_SYSTEM_VIEW`                                 |                                                                                       |
| memory — public memory/suggestions/preferences/audit/usage                              |          ❌ | `MEMORY_USE`                                        | every `/internal/*` (retrieve, record-usage, getForContext) OPEN — chat depends on it |
| memory — public context-packs (+ items/versions/templates/portable)                     |          ❌ | `CONTEXT_PACK_READ_OWN`                             | internal pack item fetch OPEN                                                         |
| workspace — per-user connectors / sync / search / actions / inbox                       |          ✅ | none (ownership-scoped)                             | the connect-own-account flow                                                          |
| workspace — ai-action policies, suggestion (trigger) rules, provider-app/OAuth registry |          ❌ | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`                 |                                                                                       |
| workspace — sync dashboard, auto-suggest runs, webhook deliveries view                  |          ❌ | `ADMIN_WORKSPACES_VIEW`                             |                                                                                       |
| workspace — webhook receiver, OAuth callback                                            |         n/a | `@Public`                                           | external callers                                                                      |
| auth — admin users / plans / roles                                                      |          ❌ | `@Roles(ADMIN)` (admin module)                      | already admin-gated; ADMIN bypass                                                     |
| chat — messages / threads                                                               |          ✅ | model-access + quota guards (Phase C)               | ownership-scoped                                                                      |

## Roles → key permission summary

|                                           |       ADMIN |   USER (MEMBER) |
| ----------------------------------------- | ----------: | --------------: |
| All permissions                           | ✅ (bypass) |              ❌ |
| Chat / model-read                         |          ✅ |              ✅ |
| Workspace own-connectors                  |          ✅ |              ✅ |
| Desktop Agent                             |          ✅ | ✅ (plan-gated) |
| Connectors / Models / Routing config      |          ✅ |              ❌ |
| Memory / Context / Files / Research pages |          ✅ |              ❌ |
| Observability / Audits / Logs / Usage     |          ✅ |              ❌ |
| Admin (users/roles/plans/automation)      |          ✅ |              ❌ |

Existing legacy roles `OPERATOR` / `VIEWER` are preserved; grant them any subset
of permissions via `/admin/roles`. The matrix is DB-backed and admin-editable —
this table is the seeded baseline, not a hardcoded map.
