# Declaration Ownership Map

Where every kind of declaration lives — and, just as important, when NOT to
extract. Backend rules: `rules/02-backend-rules.md`; frontend rules:
`rules/03-frontend-rules.md`.

## The three tiers of a declaration

Before extracting anything, classify it:

1. **Local variable / helper** — used once, inside one function, meaningful only
   there. **Keep it inline.** A `const url = ...` inside a method is a local
   variable, not a module-level const. Do not over-extract locals into
   `constants/` files.
2. **Reusable declaration** — a type/const/function used by 2+ callers within one
   service. **Extract to the service's dedicated file** (see tables below).
3. **Domain contract** — a type/value/function shared across services, or part of
   an event/permission contract. **Extract to a shared package** (see
   [package-boundaries.md](package-boundaries.md)).

The ESLint "no inline declarations" rule targets **module-level** declarations in
logic files — not locals inside functions. The goal is a single home for each
reusable/contract declaration, not the elimination of local variables.

## Backend extraction table

| What                                                 | Where                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Types/interfaces (domain)                            | `src/modules/<domain>/types/<name>.types.ts`                 |
| Types (cross-domain, one service)                    | `src/common/types/`                                          |
| Enums                                                | `src/common/enums/<name>.enum.ts`                            |
| Constants                                            | `src/common/constants/` or `src/modules/<domain>/constants/` |
| Utilities (functions)                                | `src/common/utilities/<name>.utility.ts`                     |
| DTOs (Zod schema + inferred type)                    | `src/modules/<domain>/dto/<name>.dto.ts`                     |
| Errors                                               | `src/common/errors/`                                         |
| Guards / filters / interceptors / pipes / decorators | `src/app/<kind>/`                                            |

**No inline** `type`/`interface`/`enum`/module-level `const`/standalone
`function`/string-literal union in any logic file (`*.service.ts`, `*.manager.ts`,
`*.controller.ts`, `*.repository.ts`, `*.adapter.ts`, `*.utility.ts`,
`*.guard.ts`, `*.filter.ts`, `*.pipe.ts`, `*.module.ts`, `*.interceptor.ts`).
Only exception: `private readonly logger = new Logger(MyClass.name)`.

## Frontend extraction table

| What                 | Where                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Types                | `src/types/<domain>.types.ts` (+ export from `src/types/index.ts`) |
| Component prop types | `src/types/component.types.ts`                                     |
| Enums                | `src/enums/<name>.enum.ts`                                         |
| Constants            | `src/constants/<name>.constants.ts`                                |
| Hooks                | `src/hooks/<domain>/use-<name>.ts`                                 |
| Utilities            | `src/utilities/<name>.utility.ts`                                  |
| Repositories         | `src/repositories/<domain>/<domain>.repository.ts`                 |
| Query keys           | `src/repositories/shared/query-keys.ts`                            |
| Zod schemas          | `src/lib/validation/<name>.schema.ts`                              |
| Stores               | `src/stores/<name>.store.ts`                                       |
| i18n types           | `src/types/i18n.types.ts`                                          |

**TSX files contain ONLY component definitions** — no inline
types/enums/consts/hooks/utility functions/sub-components/raw third-party
imports.

## Cross-cutting contracts (always shared packages)

| Contract                                   | Home                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| Event patterns (`EventPattern`) + payloads | `@claw/shared-types`                                          |
| Permissions (`Permission` enum)            | `@claw/shared-types` ([permission-map.md](permission-map.md)) |
| Ports / service names / exchange name      | `@claw/shared-constants`                                      |
| Cross-service functions                    | `@claw/shared-utilities`                                      |
| Plan entitlement flags                     | `@claw/shared-entitlements`                                   |

## Avoiding over-extraction (common failure)

- A one-off string used in a single method is a **local** — inline it.
- A type used by exactly one component is fine in that component's colocated
  types file; it does not need to be a "domain type" in a shared package.
- Extraction is about giving **reusable** and **contract** declarations one
  home — not about ceremony around every literal. Match the tier to the reach.

## FE/BE field-name mirroring

FE type field names MUST mirror BE DTO/Prisma field names **verbatim**. A rename
that keeps the FE type internally consistent (e.g. `createdAt`→`receivedAt`)
passes typecheck but breaks at runtime. Rename only the UI label, never the type.
