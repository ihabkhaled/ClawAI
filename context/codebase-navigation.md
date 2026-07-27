# Codebase Navigation

Where to look for any given kind of code. Grounded in the real tree under
`apps/` and `packages/`; service inventory is in `.ai/manifests/services.json`.

## Top-level layout

```
apps/
  claw-frontend/              # Next.js 16 app
  claw-<service>-service/     # 18 NestJS services (see service-catalog.md)
packages/
  shared-auth/ shared-constants/ shared-entitlements/
  shared-rabbitmq/ shared-types/ shared-utilities/
infra/nginx/                  # reverse-proxy config (nginx.conf)
docker/                       # split compose files (dev/prod × databases/services/ollama/gpu-*)
scripts/                      # claw.sh, install.sh, install.ps1, install-tls.*
rules/                        # 00-master + 00-non-negotiable + 01..09 numbered rules
skills/                       # 00-index + 01..09 operational runbooks
context/                      # this layer
agents/                       # reviewer role definitions
memory/                       # durable pitfalls/lessons
docs/                         # 00..16 numbered doc categories + features/adrs/security
tools/                        # audit, knowledge, affected, release engines
.ai/                          # generated manifests + packs + BOOTSTRAP (+ local/, gitignored)
```

## Inside a backend service (`apps/claw-<x>-service/`)

```
prisma/schema.prisma          # DB models (Postgres services)
src/
  main.ts                     # bootstrap
  app/                        # guards, filters, interceptors, pipes, decorators
  common/
    enums/                    # *.enum.ts
    constants/                # *.constants.ts
    utilities/                # *.utility.ts (third-party libs wrapped here)
    errors/                   # BusinessException, EntityNotFoundException
    types/                    # cross-domain types
  modules/<domain>/
    controllers/*.controller.ts   # 3-line methods
    <domain>.service.ts           # business logic (≤30 ln/method)
    <domain>.repository.ts        # data access (no throw)
    managers/*.manager.ts         # orchestration (≤80 ln/method)
    adapters/*.adapter.ts         # vendor SDK wrappers
    dto/*.dto.ts                  # Zod schemas + inferred types
    types/*.types.ts              # domain types
    constants/*.constants.ts
    __tests__/*.spec.ts           # jest
```

## Inside the frontend (`apps/claw-frontend/src/`)

```
app/(portal)/<route>/page.tsx     # render-only pages (102 pages total)
components/<feature>/              # presentational components (shadcn/ui for inputs)
components/ui/                     # shadcn/ui generated (do not edit)
hooks/<domain>/use-<name>.ts      # one hook = one responsibility
repositories/<domain>/            # API calls
repositories/shared/query-keys.ts # TanStack query key factories
stores/<name>.store.ts            # Zustand
types/ enums/ constants/ utilities/
lib/i18n/locales/{en,ar,de,es,fa,fr,hi,it,ja,pt,ru,th,zh}.ts
types/i18n.types.ts               # TranslationDictionary schema (atomic with locales)
```

## "I need to change X — where do I go?"

| I want to…                 | Start at                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Add/modify an API endpoint | service `controllers/` + `service` + `repository`; register in `infra/nginx/nginx.conf`                                                     |
| Add a DB field             | service `prisma/schema.prisma` → `migrate:dev`                                                                                              |
| Add/change an event        | `packages/shared-types` EventPattern first, then producer/consumer                                                                          |
| Add an env var             | `.env` + `.env.example` + `scripts/install.{sh,ps1}` + all compose files (see [environment-ownership-map.md](environment-ownership-map.md)) |
| Add a permission           | `packages/shared-types` Permission enum + auth-service RBAC seed                                                                            |
| Add a frontend page        | `src/app/(portal)/<route>/page.tsx` + hook + repository + i18n ×13                                                                          |
| Change billing/payments    | auth plan contracts + payment service + frontend repository body tests + `rules/28-billing-integrity-and-api-contracts.md`                  |
| Add shared logic           | `packages/shared-utilities` (function) / `shared-constants` (value) / `shared-types` (type)                                                 |
| Understand who calls whom  | [service-dependency-map.md](service-dependency-map.md)                                                                                      |

## Find things fast

- **Which service owns a route?** `.ai/manifests/nginx-routes.json`.
- **Which service produces an event?** `.ai/manifests/event-graph.json`.
- **Which models does a service own?** `.ai/manifests/services.json` →
  `prismaModels`/`mongooseModels`.
- **What are all endpoints?** `.ai/manifests/api-endpoints.json` (542 endpoints).
- Prefer the `Grep`/`Glob` tools over shell `find`/`grep`.

See `skills/01-codebase-navigation.md` for the operational runbook.
