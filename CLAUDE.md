# ClawAI — Complete Project Reference

## What This Is

Local-first AI orchestration platform. 17 NestJS microservices + Next.js frontend + 13 PostgreSQL + MongoDB + Redis + RabbitMQ + Ollama. Monorepo with npm workspaces.

## Architecture at a Glance

```
Frontend (Next.js 16, port 3000)
  → Nginx reverse proxy (port 4000)
    → 17 backend services (ports 4001-4017)
      → RabbitMQ (async events, topic exchange: claw.events)
      → 13 PostgreSQL (pgvector), 1 MongoDB (3 databases), 1 Redis
      → Ollama (local AI runtime, port 11434)
```

## Workspace Layout

```
apps/
  claw-frontend/            # Next.js 16, React 19, TanStack Query, Zustand, Tailwind, shadcn/ui
  claw-auth-service/        # Port 4001, PG claw_auth   — JWT, RBAC, users, sessions
  claw-chat-service/        # Port 4002, PG claw_chat   — threads, messages, context assembly, execution
  claw-connector-service/   # Port 4003, PG claw_connectors — 7 providers (OpenAI, Anthropic, Gemini, Bedrock, DeepSeek, Ollama, Grok), health, model sync
  claw-routing-service/     # Port 4004, PG claw_routing — 7 modes, Ollama-assisted AUTO, policies
  claw-memory-service/      # Port 4005, PG claw_memory  — memory CRUD + suggestion queue, extraction, sensitivity classifier, retrieval bundle, audit, usage telemetry, preferences, context packs (scopes, versions, attachments, templates)
  claw-file-service/        # Port 4006, PG claw_files   — upload, chunking (JSON/CSV/MD/text)
  claw-audit-service/       # Port 4007, MongoDB         — 10 audit events, usage ledger
  claw-ollama-service/      # Port 4008, PG claw_ollama  — model management, roles, generation
  claw-health-service/      # Port 4009, no DB           — aggregates health from all services
  claw-client-logs-service/ # Port 4010, MongoDB         — frontend logs, batched, TTL 30d
  claw-server-logs-service/ # Port 4011, MongoDB         — backend logs, Elasticsearch-ready, TTL 30d
  claw-image-service/       # Port 4012, PG claw_images  — image generation, DALL-E/Gemini/SD adapters
  claw-file-generation-service/ # Port 4013, PG claw_file_generations — file export (PDF/DOCX/CSV/HTML/MD/TXT/JSON)
  claw-agent-service/           # Port 4015, PG claw_agent — desktop agent sessions, terminal command approval, repo tracking, file events
  claw-research-service/        # Port 4016, PG claw_research — dynamic search/fetch/scrape/clone + evidence orchestration (Tavily, SearXNG, Ollama Web)
  claw-workspace-service/       # Port 4014, PG claw_workspace — workspace connectors (GitHub, GitLab, Jira, Slack, Drive, OneDrive, SharePoint, Confluence, Figma, Gmail, Bitbucket, ClickUp), OAuth2/PKCE, webhook, sync, search, scheduled background sync
  claw-llamacpp-service/        # Port 4017, PG claw_llamacpp — Local Frontier LLMs (Kimi K2, GLM-5.1, DeepSeek V3.2/V4) via vanilla llama.cpp; binary lifecycle, HF pull jobs (SSE), single-resident process supervisor, OpenAI-compatible inference proxy, hardware preflight. **Base image MUST be Debian (`node:20-bookworm-slim`)** because llama.cpp release binaries are glibc-linked and won't run on Alpine even with gcompat (missing `__res_init`, `pthread_cond_clockwait`, `__wmemcpy_chk`). `LLAMACPP_DATA_PATH` MUST point inside the `llamacpp-data` named volume (`/var/lib/claw/llamacpp` by default) so the auto-installed binary + downloaded model weights survive rebuilds.
packages/
  shared-types/      # 18 enums, event payloads, auth types
  shared-constants/  # Exchange name, ports, API prefix, pagination defaults
  shared-rabbitmq/   # RabbitMQModule, RabbitMQService (retry+DLQ), StructuredLogger
  shared-auth/       # AuthGuard, RolesGuard, @Public, @Roles, @CurrentUser decorators
infra/nginx/         # Reverse proxy config with 20+ route mappings
scripts/
  install.sh         # Automated setup (Linux/macOS)
  install.ps1        # Automated setup (Windows)
  claw.sh            # Service management (up/down/status/logs)
docs/                # 11 architecture audit documents
```

## Key Versions

- Node >= 20 (Docker images run Node 26), NestJS 11.1, Next.js 16.2, React 19.2, Prisma 7.8, Zod 4.4
- **TypeScript via tsgo** (`@typescript/native-preview`, the Go-native TS7 compiler) + `tsc-alias` — NOT `tsc`/`nest build`
- ESLint 9 (flat config), Prettier 3.8, Jest 30 (backend, ts-jest), Vitest 4 (frontend), Playwright (E2E)

### Build toolchain (tsgo) — see docs/08-runtime-devops/build-system.md

Every backend service AND shared package compiles with **tsgo**, not `tsc`/`nest build`. Path aliases (`@app/*`, `@common/*`, `@modules/*`) are rewritten to relative paths after compile by **tsc-alias** (tsgo does not rewrite paths). Per-workspace npm scripts:

- `dev` = `tsgo -p tsconfig.build.json && tsc-alias -p tsconfig.build.json && concurrently -k … "tsgo … --watch" "tsc-alias … --watch" "nodemon --watch dist … dist/main.js"`
- `build` = `tsgo -p tsconfig.build.json && tsc-alias -p tsconfig.build.json`
- `typecheck` = `tsgo --noEmit`
- `start` = `node dist/main.js`

The `typescript` dependency is **aliased** to `@typescript/native-preview@beta`; real `tsc` 6.x still resolves transitively (ts-jest uses it). Docker images use **`node:26-bookworm-slim`** (glibc — tsgo and llama.cpp release binaries are not musl-compatible, so NOT Alpine). CI links the native binary with `npm rebuild @typescript/native-preview` and builds shared packages with `npx tsgo -p tsconfig.build.json`. The frontend runs `vitest run` directly (no wrapper script).

---

## MANDATORY Change Checklist

**Every change you make MUST also consider updating these files if affected:**

1. **`.env.example`** — add/remove/rename any environment variable
2. **`.env`** — fill the new variable with a working dev value
3. **`scripts/install.sh`** — add the variable to the generated .env block
4. **`scripts/install.ps1`** — same for Windows PowerShell installer
5. **ALL split Docker compose files** — `docker/docker-compose.dev.{databases,services,ollama}.yml`, `docker/docker-compose.prod.{databases,services,ollama}.yml`, plus the per-vendor GPU overlays (`gpu-nvidia`, `gpu-rocm`, `gpu-vulkan` × dev/prod) if your service needs GPU passthrough — if new service, port, volume, database, or AI runtime dependency
6. **i18n locale files** — if any new user-facing text (ALL 9 locales: en, ar, de, es, fr, hi, it, pt, ru)
7. **Architecture docs** (`docs/`) — if the change affects documented architecture
8. **Prisma migrations** — if any schema change (`npx prisma migrate dev --name <name>`)
9. **Seed files** — if new default data needed (e.g., admin user, default policies)
10. **Test files** — create or update tests for every code change
11. **Frontend types** — sync `src/types/` with backend DTO/schema changes
12. **`CLAUDE.md`** — if adding new services, env vars, patterns, or rules

13. **`.github/workflows/ci.yml`** — add new service to the Prisma generate loop and test env vars
14. **`infra/nginx/nginx.conf`** — add upstream + location block for the new service
15. **`packages/shared-constants`** — add service port and service name constants
16. **`packages/shared-types`** — add new event patterns if the service publishes events
17. **Health service** (`apps/claw-health-service`) — add the new service URL to health check list
18. **`apps/claw-frontend`** — update model selectors, types, hooks, and components if user-facing
19. **`scripts/install-tls.sh` + `scripts/install-tls.ps1`** — append the new service's docker hostname to the `HOSTS` array so the next `install-tls` run reissues the leaf cert with that SAN. Without this, inter-service HTTPS calls into the new service fail TLS verification with `Hostname/IP doesn't match certificate`. See `docs/08-runtime-devops/tls-setup.md`.

**Never skip any of these.** A feature is incomplete if any of these are missing.

---

## Universal Code Rules (MUST follow everywhere)

### Absolute Rules (Backend + Frontend)

1. NEVER use `any` — use `unknown`, generics, or proper types
2. NEVER disable ESLint rules — fix the underlying issue
3. NEVER use string literal unions — use enums from `src/enums/` or `src/common/enums/`
4. NEVER compare domain values with raw strings — use enum comparisons
5. NEVER log secrets, tokens, API keys, passwords
6. NEVER expose secrets to the frontend
7. NEVER allow missing explicit return types
8. NEVER build god-files — keep modules focused and small
9. NEVER define types/interfaces/enums/constants inline — extract to dedicated files
10. NEVER put business logic in controllers (3-line methods: extract, call, return)
11. NEVER put Prisma/Mongoose calls outside repositories
12. NEVER cross database boundaries — use RabbitMQ or HTTP
13. Each service owns its data — no shared databases
14. Use `type` over `interface` unless declaration merging needed
15. NEVER use `process.env` directly — use AppConfig (Zod-validated)
16. NEVER use `console.log` — use NestJS Logger (backend) or logger utility (frontend)
17. NEVER use `!` non-null assertion — handle nullability explicitly
18. NEVER use `==` or `!=` — always use `===` and `!==`
19. NEVER use `var` — use `const`, or `let` only when reassignment is required
20. NEVER add features without tests — every new function needs a test
21. NEVER add user-facing text without i18n — extract to translation files

### Library Wrapping Rule

Every third-party library MUST be wrapped in `src/common/utilities/<name>.utility.ts`. Services/controllers NEVER import third-party packages directly. If the library changes, only the wrapper file needs updating.

---

## ESLint Rules (Enforced Across All Services)

### Backend ESLint (all 11 NestJS services share identical config)

**Plugins**: typescript-eslint (strict), eslint-plugin-security, eslint-plugin-unicorn, eslint-plugin-import-x

**TypeScript Rules (errors)**:

- `no-explicit-any` — use unknown/generics
- `no-unused-vars` — except `_` prefixed
- `no-non-null-assertion` — handle nullability explicitly
- `no-floating-promises` — await or void all promises
- `no-misused-promises` — no promises in boolean positions
- `default-param-last`, `no-useless-empty-export`, `no-loop-func`
- `return-await` — only in try-catch

**TypeScript Rules (warnings)**:

- `consistent-type-imports` — prefer `import type`, inline style
- `explicit-function-return-type` — allow expressions/higher-order
- `prefer-nullish-coalescing`, `prefer-optional-chain`, `no-shadow`

**Core JS (errors)**:

- `no-console` — only warn/error allowed
- `eqeqeq` — always strict equality
- `no-var`, `prefer-const`, `no-eval`, `no-implied-eval`, `no-new-func`
- `prefer-template`, `no-param-reassign` (props: false)

**Security (errors)**: detect-eval-with-expression, detect-no-csrf, detect-buffer-noassert, detect-disable-mustache-escape, detect-new-buffer
**Security (warnings)**: detect-object-injection, detect-non-literal-regexp, detect-timing-attacks, detect-non-literal-fs, detect-child-process, detect-pseudoRandomBytes, detect-unsafe-regex

**Unicorn (errors)**: prefer-node-protocol, no-nested-ternary, prefer-string-slice
**Unicorn (warnings)**: no-array-for-each, no-useless-undefined, prefer-ternary, prefer-array-find/some/includes, prefer-number-properties, no-lonely-if, no-array-push-push, prefer-spread, prefer-string-replace-all, prefer-at

**Import-x (errors)**: no-duplicates (prefer-inline), first, newline-after-import, no-mutable-exports, no-self-import, no-useless-path-segments
**Sort-imports (warn)**: ignoreCase, ignoreDeclarationSort

### Backend File-Specific Restrictions

**All logic files** (service, controller, repo, module, guard, interceptor, filter, pipe, manager, utility):

- NO inline `TSInterfaceDeclaration` — extract to types/ file
- NO inline `TSTypeAliasDeclaration` — extract to types/ file
- NO inline `TSEnumDeclaration` — extract to common/enums/
- NO top-level `const` — extract to constants/ file
- NO standalone `FunctionDeclaration` — extract to utilities/
- NO string literal unions (`'a' | 'b'`) — use enums

**Service files** (`*.service.ts`): max 50 lines/function, complexity 10
**Manager files** (`*.manager.ts`): max 80 lines/function, complexity 15
**Controller files** (`*.controller.ts`): + NO try/catch, NO throw
**Repository files** (`*.repository.ts`): + NO throw (return data, let services decide)
**Test files** (`*.spec.ts`): all restrictions OFF, `any` allowed

### Frontend ESLint

**Additional Plugins**: eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y

**React Rules (errors)**: jsx-no-target-blank, jsx-boolean-value (never), jsx-curly-brace-presence (never), self-closing-comp, no-danger, no-unstable-nested-components, jsx-no-useless-fragment, jsx-no-constructed-context-values
**React Hooks (errors)**: rules-of-hooks, exhaustive-deps (warn)
**Accessibility**: alt-text, anchor-is-valid (errors); click-events-have-key-events, no-static-element-interactions, label-has-associated-control (warnings)

**Additional Core Rules**: no-nested-ternary, curly (all), no-else-return, object-shorthand, no-useless-rename, no-script-url

**Import Order**: enforced groups (builtin > external > internal > parent > sibling > index), `@/**` treated as internal, alphabetized, newlines between groups

### Frontend File-Specific Restrictions

**TSX component files**:

- NO inline types/interfaces/enums — extract to src/types/
- NO inline hooks (`useX`) — extract to src/hooks/
- NO SCREAMING_CASE constants — extract to src/constants/
- NO utility functions (format/parse/transform/etc.) — extract to src/utilities/
- NO module-level const (except component definitions) — extract to src/constants/
- NO non-PascalCase function declarations — only component definitions allowed

**Hooks/stores files**: NO inline types/enums, NO inline constants (except objects/calls)
**Service files**: NO inline types/enums, NO inline constants
**shadcn/ui files** (`src/components/ui/`): all restrictions OFF (auto-generated, do not edit)
**Test files**: all restrictions OFF

### Commit Lint

Conventional commits required: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`
Subject: max 100 chars, no sentence-case/start-case/pascal-case/upper-case

---

## Backend Architecture Rules

### Layer Responsibilities

```
Controller → Service → Repository (data access only)
                    → Manager (complex logic, external calls)
```

### Controller Rules

- 3-line methods ONLY: extract params, call ONE service method, return result
- NO try/catch — use GlobalExceptionFilter
- NO business logic — delegate everything to services
- NO direct database access
- ONE service call per endpoint

### Service Rules

- **Max 30 lines per method** — if longer, extract helper methods or delegate to manager
- Split complex methods into smaller private methods
- Each public method does ONE thing
- Validate ownership/permissions here (not in controller or repository)
- Publish events here (not in controller)
- If a method grows beyond 30 lines, refactor immediately:
  - Extract validation logic to a private method
  - Extract transformation logic to a private method
  - Move complex orchestration to a Manager class

### Manager Rules

- **Max 80 lines per method, complexity limit 15**
- Handles complex orchestration (multiple service calls, external APIs, retries)
- If a method grows beyond 80 lines, break into smaller private methods
- Each private helper should be <30 lines
- Name clearly: `buildPromptString()`, `fetchConnectorConfig()`, `parseResponse()`

### Repository Rules

- Pure data access ONLY — no business logic, no throw statements
- Return data or null — let services decide what to do
- Each method maps to ONE database operation
- Use Prisma/Mongoose query builders — no raw SQL

### DTO/Validation Rules

- ALL input validated with Zod schemas
- Every `z.string()` MUST have `.max()` for length limits
- Every `z.array()` MUST have `.max()` for size limits
- Zod schemas go in `src/modules/<domain>/dto/<name>.dto.ts`
- Export both the schema and the inferred type

### Error Handling

- All errors use `BusinessException` with a machine-readable `code` string
- Entity-not-found uses `EntityNotFoundException`
- Forbidden access uses `BusinessException` with `HttpStatus.FORBIDDEN`
- NEVER swallow errors silently — always log and rethrow or handle explicitly

### No Inline Declarations Rule (Backend)

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in ANY of these file types:

- `*.service.ts`, `*.manager.ts`, `*.controller.ts`, `*.repository.ts`
- `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`
- `*.interceptor.ts`, `*.pipe.ts`, `*.module.ts`, `*.provider.ts`

All declarations MUST be in their dedicated files per the extraction table below.
The only exception: `private readonly logger = new Logger(...)` inside NestJS classes (this is the standard NestJS pattern).

### Extraction Rules (Backend)

| What             | Where                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| Types/interfaces | `src/modules/<domain>/types/<name>.types.ts`                                    |
| Enums            | `src/common/enums/<name>.enum.ts`                                               |
| Constants        | `src/common/constants/<name>.constants.ts` or `src/modules/<domain>/constants/` |
| Utilities        | `src/common/utilities/<name>.utility.ts`                                        |
| DTOs             | `src/modules/<domain>/dto/<name>.dto.ts`                                        |
| Errors           | `src/common/errors/`                                                            |
| Pipes            | `src/app/pipes/`                                                                |
| Guards           | `src/app/guards/`                                                               |
| Filters          | `src/app/filters/`                                                              |
| Interceptors     | `src/app/interceptors/`                                                         |
| Decorators       | `src/app/decorators/`                                                           |

---

## Frontend Architecture Rules

### Component Architecture

```
Page (.tsx) → Controller Hook (useX) → Service → Repository/API
```

### Page Rules (`.tsx` files in `src/app/`)

- Pure render composition ONLY — no logic, no hooks (except ONE controller hook)
- Must handle: loading state, empty state, error state
- No inline styles — use Tailwind classes via `cn()` utility
- No default exports except Next.js pages/layouts

### Component Rules

- Each component does ONE thing — if it's doing two things, split it
- Props-only data flow — components NEVER fetch data internally
- Use shadcn/ui for ALL form inputs (Input, Select, Textarea, Checkbox, etc.)
- No raw HTML `<select>`, `<input>`, `<textarea>`
- No `dangerouslySetInnerHTML`
- Every component that needs logic gets its own hook

### Hook Rules

- **Single responsibility** — each hook does exactly ONE thing (state, query, mutation, etc.)
- **Max 50 lines per hook** (excluding imports and types). If exceeded, split into smaller hooks.
- Controller hooks orchestrate smaller hooks, they don't contain business logic
- Pattern: `useSendMessage()`, `useThreadDetail()`, `useThreadSettings()` — NOT one giant `useChat()`
- All GET requests via TanStack Query `useQuery` with proper query key factories
- All mutations via TanStack Query `useMutation` with `onSuccess` invalidation
- Never call `useQuery`/`useMutation` directly in `.tsx` files — wrap in custom hooks
- Hooks go in `src/hooks/<domain>/use-<name>.ts` — NEVER inside component files
- **NEVER** define `type`, `interface`, `enum`, or `const` inline in hook files — extract to `src/types/`, `src/enums/`, `src/constants/`
- **NEVER** call React hooks directly in `.tsx` files — ALL hook usage must be via a single controller hook
- **NEVER** define inline sub-components (helper JSX functions) in `.tsx` files — extract each to its own `.tsx` file

### State Management Rules

- TanStack Query for ALL server state (queries + mutations)
- Zustand for MINIMAL client-only state (auth, sidebar, log filters)
- React hooks for component-level state
- No prop drilling beyond 2 levels — use context or composition
- No redundant state — if it can be derived, derive it

### Styling Rules

- CSS variables for theming (`--background`, `--foreground`, `--primary`, etc.)
- Semantic Tailwind classes (`text-muted-foreground`, `bg-card`, `border-border`)
- NO `dark:` prefixes — CSS variables handle dark mode automatically
- NO raw color classes (`text-blue-500`) for semantic meaning
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Mobile-first with `sm:`, `md:`, `lg:` breakpoints

### Extraction Rules (Frontend)

| What                 | Where                                              |
| -------------------- | -------------------------------------------------- |
| Types                | `src/types/<domain>.types.ts`                      |
| Component prop types | `src/types/component.types.ts`                     |
| Enums                | `src/enums/<name>.enum.ts`                         |
| Constants            | `src/constants/<name>.constants.ts`                |
| Hooks                | `src/hooks/<domain>/use-<name>.ts`                 |
| Utilities            | `src/utilities/<name>.utility.ts`                  |
| Repositories         | `src/repositories/<domain>/<domain>.repository.ts` |
| Query keys           | `src/repositories/shared/query-keys.ts`            |
| Zod schemas          | `src/lib/validation/<name>.schema.ts`              |
| Stores               | `src/stores/<name>.store.ts`                       |
| i18n types           | `src/types/i18n.types.ts`                          |

### i18n Rules

- 9 languages: EN, AR, DE, ES, FR, HI, IT, PT, RU (Arabic is RTL)
- ALL user-facing text must use `t('key')` from `useTranslation()`
- NEVER hardcode text in components
- Locale files: `src/lib/i18n/locales/{en,ar,de,es,fr,hi,it,pt,ru}.ts`
- When adding new text: add to ALL 9 locale files
- Type-safe keys defined in `src/types/i18n.types.ts`

#### `i18n.types.ts` MUST be committed alongside every locale change

The TranslationDictionary type in
`apps/claw-frontend/src/types/i18n.types.ts` is the schema every
locale file conforms to. If you add a new key to any locale `.ts`
file, you MUST also update `i18n.types.ts` in the SAME commit. If
you skip the type, the next typecheck fails for everyone — the
locale files become provably wrong at the type level even though
they look fine to a reader.

This is non-negotiable: i18n.types.ts and locales/\*.ts are one
atomic change. Never push one without the other.

#### NEVER leak English into non-English locales

When adding a new i18n key, you MUST write a real, native translation
for every locale — `ar`, `de`, `es`, `fr`, `hi`, `it`, `pt`, `ru`. Do
NOT copy the English string into the other locale files as a
placeholder. The user reads `de.ts` expecting German; copying English
ships an English UI to a German user.

This is a recurring failure mode that has been corrected three times
in this codebase (commits documented in the i18n catch-up batches).
Past mistakes:

- `dashboard.newChatLabel = 'New Chat'` was added to all 9 locale
  files identically. The German user saw "New Chat" instead of
  "Neuer Chat".
- `inbox.page.title = 'Workspace Inbox'` shipped identically to
  all 9 locales. The Arabic user saw English text in an RTL UI.
- 1131 entries across 8 non-EN locales had `value === enValue`
  silently — caught only by an explicit audit script, not by
  typecheck.
- `adminAutomation.policies.description` and
  `adminAutomation.rules.description` shipped to all 8 non-EN
  locales as English placeholders for the entire ai-action-
  policies and suggestion-rules admin pages. Caught 2026-05-10
  during an end-to-end admin audit, not by typecheck.

Required practice when introducing new i18n keys:

1. Add to `en.ts` first with the real English copy.
2. Translate to each of the 8 other locales **into that target
   language**, not English. Use a translation table or call out
   to a translator if a string is technical.
3. Loanwords that are genuinely identical in target languages
   (brand names like `Confluence` / `GitHub`, technical jargon
   like `Story Points`, units like `GB`/`ms`, placeholder-only
   strings like `{ms}ms`) ARE acceptable as identical values —
   but you must KNOW that this is the case for that specific
   word in that specific language. "I don't know what `Filter`
   is in Italian" → look it up (`Filtro`), do not copy `Filter`.
4. Run the audit script before committing:
   `node tools/audit-untranslated-i18n.cjs` — it flags every
   non-EN entry whose value matches the EN value, minus the
   exempt set. The pre-merge bar is: every flagged entry is
   either a real translation or a documented exempt loanword.

If you are an AI assistant adding i18n keys: assume the user
will spot-check at least one non-English locale by switching
the UI language. Test in `de` or `ar` before declaring done —
a 3-second language toggle is the cheapest way to catch this.

#### `t()` is NOT type-safe against `TranslationDictionary`

The `useTranslation()` hook returns `t: (key: string, params?) => string`.
The first parameter is plain `string`, NOT `keyof TranslationDictionary`.
That means TypeScript will **never** flag a call like
`t('admin.policies.title')` when the actual key in the dictionary is
`adminAutomation.policies.title`. At runtime the literal key string
gets rendered to the user as-is.

This bit hard on 2026-05-10: the entire `/admin/ai-action-policies`
and `/admin/suggestion-rules` pages rendered raw `admin.policies.X`
and `admin.rules.X` strings because the FE called those keys but the
locale dictionaries declared them under `adminAutomation.*`.
Typecheck was green, lint was green, tests were green. Only a
browser visit caught it.

Mitigations (in priority order):

1. **Co-locate the i18n type schema and the page that uses it.** When
   you add a t() call, immediately check that key chain exists in
   `i18n.types.ts`. The 30-second cost beats a 30-minute audit.
2. **Spot-check at least one non-EN locale visually** after changes
   that add new t() calls. If a raw key like `admin.policies.title`
   slips through, you'll see it instantly in the UI.
3. **Long-term:** make `t()` generic over `TranslationDictionary` so
   `t('non.existent.key')` becomes a typecheck error. Filed as
   technical debt; rolling out across the codebase needs a sweep.

### Frontend Key Rules Summary

- No `any` types anywhere
- No `eslint-disable` comments
- No `console.log` — only `console.warn` and `console.error`
- All imports of types use `import type { ... }` syntax
- All new pages need loading, empty, and error states
- All new API calls go through repositories
- TSX files contain only render composition — ZERO business logic
- **FE type field names MUST mirror BE DTO/Prisma field names verbatim.**
  Renaming `createdAt` → `receivedAt` on the FE type silently breaks date
  rendering because `new Date(undefined).toLocaleString() === "Invalid Date"`
  — and typecheck won't catch it because the FE type is internally consistent.
  Bit us on `WebhookDelivery` (2026-05-10). If you need a friendlier label,
  rename only in the UI string, not the type.
- **When the BE Zod schema is `.strict()`, the FE filter type must be the
  exact intersection of accepted keys — not a superset.** A "dead" filter
  field like `status` on `WebhookDeliveryFilter` will 400 the whole request
  the moment some future caller sets it.
- **Every `useMutation` must have `onError` + a user-visible surfacing
  path.** Default pattern: `onError` calls `showToast.apiError(err, t('…'))`
  AND records the error to a local `mutationError` state shown as a
  dismissable banner. Silent mutation failure is a delivery blocker.
- **Per-row mutation state is the default, not a polish item.** A single
  `isMutating: boolean` on the page disables every row in the list when
  one row is updating. Use a `pendingId: string \| null` from the hook and
  derive `isMutating={pendingId === row.id}` per row.

---

## Data Models (Quick Reference)

### Auth (PostgreSQL)

- `User` — email, username, passwordHash, role (ADMIN/OPERATOR/VIEWER), status, preferences
- `Session` — userId, refreshToken, expiresAt (rotation implemented)
- `SystemSetting` — key/value store

### Chat (PostgreSQL)

- `ChatThread` — userId, title, routingMode, preferredProvider/Model, contextPackIds[], systemPrompt, temperature, maxTokens, **V2 Integration**: useMemory, useContext (per-thread toggles)
- `ChatMessage` — threadId, role, content, provider, model, routingMode, inputTokens, outputTokens, latencyMs, feedback, metadata(JSON)
- `MessageAttachment` — messageId, fileId, type
- `ChatMessageContextReceipt` (**V2 Integration**) — messageId UNIQUE, threadId, userId, payloadJson (RetrievalBundle: memories, packItems, assemblyOrder, tokenBudget, warnings), createdAt — backs "why was this used?"

### Connectors (PostgreSQL)

- `Connector` — name, provider (7 types: OPENAI, ANTHROPIC, GEMINI, AWS_BEDROCK, DEEPSEEK, OLLAMA, GROK), status, encryptedConfig (AES-256-GCM), baseUrl
- `ConnectorModel` — modelKey, displayName, lifecycle, capability flags (streaming/tools/vision/audio)
- `ConnectorHealthEvent`, `ModelSyncRun`

### Routing (PostgreSQL)

- `RoutingDecision` — selectedProvider/Model, confidence, reasonTags[], privacyClass, costClass, fallback
- `RoutingPolicy` — name, routingMode, priority, config(JSON), isActive

### Memory (PostgreSQL + pgvector)

- `MemoryRecord` — userId, type (FACT/PREFERENCE/INSTRUCTION/SUMMARY), content, sourceThreadId/MessageId, isEnabled, **V2**: scope (USER/THREAD/WORKSPACE/PROJECT), scopeRef, tags, category, priority, confidence, source (USER_MANUAL/AI_EXTRACTED/AUTOMATION_LEARNING/IMPORTED), sensitivity (NORMAL/SENSITIVE/REDACTED), retentionPolicy (PERMANENT/EXPIRING/AUTO_DECAY), expiresAt, pinned, pausedUntil, qualityScore, useCount, lastUsedAt, provenanceJson
- `MemorySuggestion` (**V2**) — userId, type, content, confidence, sensitivity, reason, status (PENDING/APPROVED/REJECTED/AUTO_APPROVED/DISMISSED/EXPIRED), decidedAt, decidedBy, resultingMemoryId, sourceThreadId/MessageId
- `MemoryUsage` (**V2**) — memoryId, userId, threadId, messageId, score, reason
- `MemoryAuditLog` (**V2**) — memoryId (nullable; row outlives deletion), userId, action (CREATED/UPDATED/DELETED/USED/APPROVED/REJECTED/TOGGLED/PAUSED/RESUMED/REDACTED/IMPORTED/EXPORTED), actor, details
- `MemoryPreference` (**V2**) — userId, pausedAll, autoApproveThreshold (default 0.85), defaultRetention, defaultExpiresInDays, redactByDefault
- `ContextPack` — name, description, scope, **V2**: scope (USER/WORKSPACE/PROJECT/THREAD enum), scopeRef, legacyScope (free-text back-compat), tags, visibility (PRIVATE/WORKSPACE/PUBLIC), isEnabled, pausedUntil, pinned, color, icon, version, templateId, ownerUserId, useCount, lastUsedAt, qualityScore
- `ContextPackItem` — type, content, fileId, sortOrder, **V2**: itemType (TEXT/FILE/URL/MARKDOWN/SNIPPET/MEMORY_REF), legacyType, url, memoryRefId, isEnabled, pinned, tokenCountEstimate, compressedSummary
- `ContextPackVersion` (**V2**) — packId, version, payloadJson, summary, changedBy, createdAt (immutable history, pruned at 20 per pack)
- `ContextPackUsage` (**V2**) — packId, userId, threadId, messageId, itemIdsUsed[], score
- `ContextPackAttachment` (**V2**) — packId, scope, scopeRef, attachedBy, isActive
- `ContextPackTemplate` (**V2**) — name, description, category, isSystem, payloadJson

### Files (PostgreSQL)

- `File` — userId, filename, mimeType, sizeBytes, storagePath, ingestionStatus
- `FileChunk` — fileId, chunkIndex, content

### Ollama (PostgreSQL)

- `LocalModel` — name, tag, runtime, family, parameters, sizeBytes
- `LocalModelRoleAssignment` — modelId, role (ROUTER/FALLBACK_CHAT/REASONING/CODING), isActive
- `PullJob`, `RuntimeConfig`

### Audit (MongoDB)

- `AuditLog` — userId, action, entityType, entityId, severity, details
- `UsageLedger` — resourceType, action, quantity, unit, metadata

### Logs (MongoDB, TTL 30 days)

- `ClientLog` — level, message, component, action, userId, route, userAgent
- `ServerLog` — level, serviceName, module, action, requestId, traceId, userId, threadId

---

## Event Bus (RabbitMQ)

Exchange: `claw.events` (topic, durable). DLQ + 3 retries with backoff.

| Event                                 | Publisher                          | Consumers                |
| ------------------------------------- | ---------------------------------- | ------------------------ |
| message.created                       | chat                               | routing                  |
| message.routed                        | routing                            | chat                     |
| message.completed                     | chat                               | audit, memory            |
| thread.created                        | chat                               | —                        |
| user.login/logout                     | auth                               | audit                    |
| connector.created/updated/deleted     | connector                          | audit                    |
| connector.synced                      | connector                          | audit, routing           |
| connector.health_checked              | connector                          | audit, routing           |
| routing.decision_made                 | routing                            | audit                    |
| memory.extracted                      | memory                             | audit                    |
| memory.suggested                      | memory                             | audit                    |
| memory.approved                       | memory                             | audit                    |
| memory.rejected                       | memory                             | audit                    |
| memory.used                           | memory                             | audit                    |
| memory.forgotten                      | memory                             | audit                    |
| memory.paused                         | memory                             | audit                    |
| memory.redacted                       | memory                             | audit                    |
| context_pack.created                  | memory                             | audit                    |
| context_pack.updated                  | memory                             | audit                    |
| context_pack.deleted                  | memory                             | audit                    |
| context_pack.attached                 | memory                             | audit                    |
| context_pack.detached                 | memory                             | audit                    |
| context_pack.used                     | memory                             | audit                    |
| context_pack.version_created          | memory                             | audit                    |
| context_pack.version_reverted         | memory                             | audit                    |
| context_pack.shared                   | memory                             | audit                    |
| context.receipt_written               | chat                               | audit                    |
| chat_thread.memory_toggled            | chat                               | audit                    |
| chat_thread.context_toggled           | chat                               | audit                    |
| file.uploaded/chunked                 | file                               | —                        |
| log.server                            | all services                       | server-logs              |
| image.generated                       | image                              | audit                    |
| image.failed                          | image                              | audit                    |
| file.generated                        | file-gen                           | audit                    |
| file_generation.failed                | file-gen                           | audit                    |
| agent.session.connected               | agent                              | audit                    |
| agent.session.disconnected            | agent                              | audit                    |
| agent.device_paired                   | agent                              | audit                    |
| agent.device_revoked                  | agent                              | audit                    |
| agent.token_rotated                   | agent                              | audit                    |
| agent.token_reuse_detected            | agent                              | audit                    |
| agent.policy_violated                 | agent                              | audit                    |
| agent.capability.proposed             | agent                              | audit                    |
| agent.capability.policy_matched       | agent                              | audit                    |
| agent.capability.auto_approved        | agent                              | audit, capability-runner |
| agent.capability.approved             | agent                              | audit, capability-runner |
| agent.capability.rejected             | agent                              | audit                    |
| agent.capability.executing            | agent                              | audit                    |
| agent.capability.executed             | agent                              | audit                    |
| agent.capability.failed               | agent                              | audit                    |
| agent.capability.cancelled            | agent                              | audit                    |
| agent.capability.expired              | agent                              | audit                    |
| agent.capability.rolled_back          | agent                              | audit                    |
| agent.capability.denied               | agent                              | audit                    |
| workspace.sync.run_started            | workspace                          | audit                    |
| workspace.sync.run_completed          | workspace                          | audit                    |
| workspace.sync.run_failed             | workspace                          | audit                    |
| workspace.sync.stale_detected         | workspace                          | audit                    |
| workspace.sync.manual_triggered       | workspace                          | audit                    |
| workspace.sync.paused                 | workspace                          | audit                    |
| workspace.sync.resumed                | workspace                          | audit                    |
| workspace.sync.rate_limited           | workspace                          | audit                    |
| workspace.sync.dlq_sent               | workspace                          | audit                    |
| llamacpp.binary.installed             | llamacpp                           | audit                    |
| llamacpp.binary.updated               | llamacpp                           | audit                    |
| llamacpp.pull.started                 | llamacpp                           | audit                    |
| llamacpp.pull.progress                | llamacpp                           | audit                    |
| llamacpp.pull.completed               | llamacpp                           | audit                    |
| llamacpp.pull.failed                  | llamacpp                           | audit                    |
| llamacpp.model.loaded                 | llamacpp                           | audit, routing           |
| llamacpp.model.unloaded               | llamacpp                           | audit, routing           |
| llamacpp.model.crashed                | llamacpp                           | audit, routing           |
| llamacpp.weights.deleted              | llamacpp                           | audit                    |
| llamacpp.preflight.overridden         | llamacpp                           | audit                    |
| routing.models.synced                 | routing                            | audit                    |
| runtime.progress.stage_changed        | chat / image (declared, SSE today) | audit (planned)          |
| runtime.progress.content_delta        | chat (declared, SSE today)         | audit (planned)          |
| runtime.progress.reasoning_delta      | chat (declared, SSE today)         | audit (planned)          |
| runtime.progress.metrics_tick         | chat (declared, SSE today)         | audit (planned)          |
| runtime.progress.usage_final          | chat (declared, SSE today)         | audit (planned)          |
| runtime.progress.image_preview        | image (declared, SSE today)        | audit (planned)          |
| runtime.progress.node_progress        | image / ComfyUI (PR4 — SSE today)  | audit (planned)          |
| runtime.progress.step_progress        | image / SD WebUI (PR3 — SSE today) | audit (planned)          |
| runtime.progress.prompt_eval_progress | chat / llama.cpp (declared)        | audit (planned)          |
| runtime.progress.artifact_saved       | image (PR3+PR4 — SSE today)        | audit (planned)          |
| runtime.progress.error                | chat / image (declared, SSE today) | audit (planned)          |
| runtime.progress.cancelled            | chat / image (declared, SSE today) | audit (planned)          |

> **Note (2026-05-31, PR2-5 shipped):** the 12 `runtime.progress.*` patterns
> are declared in `packages/shared-constants/src/runtime-progress-events.constants.ts`.
> PR2-5 emit `ClawRuntimeProgressEvent` envelopes for these semantics
> end-to-end (chat-service for text runtimes; image-service SD WebUI +
> ComfyUI adapters for image runtimes — specifically `step_progress`,
> `node_progress`, `artifact_saved`, and their `stage_changed` /
> `metrics_tick` / `error` / `cancelled` siblings) but deliver them over
> the in-process SSE channel only. Durable RabbitMQ publishing of these
> patterns is on the future-work backlog. See
> `docs/03-architecture/runtime-progress.md` §9.

---

## Local-runtime rich-progress (extends cloud rich-progress)

ClawAI's cloud chat path already streams lifecycle stages + content deltas +
reasoning deltas + token/cost metrics over `@Sse('stream/:threadId')` in
chat-service. Local runtimes (Ollama, llama.cpp, ComfyUI, SD WebUI) historically
showed only a generic spinner because chat-service called them buffered and
re-emitted a single `COMPLETE` event when the response returned.

**Status (2026-05-31): PR1 + PR2 + PR3 + PR4 + PR5 all shipped to `main`.**
Local-runtime users now get the same depth of progress UI cloud users get.
Full architecture in
[`docs/03-architecture/runtime-progress.md`](docs/03-architecture/runtime-progress.md);
user-facing summary in
[`docs/LOCAL_RUNTIME_PROGRESS.md`](docs/LOCAL_RUNTIME_PROGRESS.md); decision
record in [`docs/LOCAL_RUNTIME_PROGRESS_ADR.md`](docs/LOCAL_RUNTIME_PROGRESS_ADR.md).

Roadmap status:

- **PR1 — shipped.** Envelope (`ClawRuntimeProgressEvent` + 9 enums in
  `packages/shared-types/src/runtime-progress/`), admin probe endpoints,
  llama.cpp think-tag leak fix (`ThinkTagScanner` via
  `LLAMACPP_REASONING_EXTRACTION_ENABLED`), frontend panel decomposition
  (`RuntimeProgressPanel` + sub-panels), probe scripts under
  `scripts/local-runtime-probes/`.
- **PR2 — shipped.** Chat-service text-runtime metrics + bottleneck.
  `NormalizedStreamFragment.finalTimings` propagates Ollama-style
  `prompt_eval_duration` / `eval_duration` / `load_duration` through
  `ProviderStreamReader` → `ProviderStreamExecutor.buildFinalMetrics()`,
  and the final METRICS event now carries `modelLoadMs` / `promptEvalMs` /
  `generationMs` / `tokensPerSecond` + a `bottleneck` object + a
  `stageTimings` map. New `RuntimeBottleneckBreakdown` component +
  `RuntimeStageTimeline` filled in (was a PR1 stub).
- **PR3 — shipped.** Stable Diffusion WebUI progress adapter
  (`stable-diffusion-webui-progress.adapter.ts`): polls
  `/sdapi/v1/progress`, emits `STEP_PROGRESS` + `ARTIFACT_SAVED`,
  cancels via `/sdapi/v1/interrupt`. New env vars
  `CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS` (default `1000`, min `300`) and
  `CLAW_IMAGE_PROGRESS_PREVIEW_ENABLED` (default `false`). New frontend
  `ImageGenerationProgressPanel`.
- **PR4 — shipped.** ComfyUI WebSocket adapter
  (`comfyui-progress.adapter.ts`): drives `POST /prompt` → consume `/ws`
  events → fetch `/history` artifact, normalizes to NODE_PROGRESS /
  EXECUTING_NODE / NODE_COMPLETED / ARTIFACT_SAVED. New env var
  `COMFYUI_BASE_URL` (default `http://comfyui:8188`). Workflow template
  loader + node mapper (SD-1.5 baseline). New frontend
  `ComfyUINodeTimeline` component.
- **PR5 — shipped.** `/admin/runtime-progress` parallel-probe diagnostics
  page with `RuntimeProbeCard` per runtime. ADMIN-gated, sidebar entry
  added, AdminGuard enforced.

**This work EXTENDS the cloud rich-progress system. It does NOT build a
parallel stack.** The only remaining future-work item is wiring the 12
declared `runtime.progress.*` RabbitMQ patterns to publish durably (today
they flow over the in-process SSE channel only — that includes the PR3
SD WebUI `step_progress` / `artifact_saved` stream and the PR4 ComfyUI
`node_progress` / `executing_node` / `node_completed` / `artifact_saved`
stream). See `.claude/Integrations/pr2-5__live_smoke.md` for the
end-to-end smoke evidence against the deployed stack.

---

## Message Flow (End-to-End)

```
1. User sends message → POST /chat-messages {content, provider?, model?, fileIds?}
2. Chat service creates USER message, publishes message.created
3. Routing service receives → Ollama router (temp=0, Zod validated) or heuristic
4. Routing publishes message.routed {selectedProvider, selectedModel, fallback}
5. Chat service receives → ContextAssemblyManager.assemble():
   - Fetch memories from memory-service (HTTP, user-scoped, limit 20)
   - Fetch context pack items from memory-service (HTTP, per attached pack)
   - Fetch file chunks from file-service (HTTP, per attached file)
   - Build prompt: system → memories → packs → files → thread history
   - Token budget truncation (keeps head, drops tail)
6. ChatExecutionManager.execute(): calls Ollama or cloud provider with fallback chain
7. Store ASSISTANT message, update thread.lastProvider/Model
8. SSE emitCompletion() to connected clients
9. Publish message.completed (includes content for memory extraction)
10. Memory service extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY via Ollama (with dedup check)
11. Audit service records usage + audit log
```

### Parallel Multi-Model Flow

```
1. User sends parallel request → POST /chat-messages/parallel {content, models[], threadId, fileIds?}
2. Chat service creates USER message
3. ContextAssemblyManager.assemble() builds prompt once (shared across all models)
4. ParallelExecutionManager fires 2-5 LLM calls via Promise.allSettled()
5. Each fulfilled result stored as separate ASSISTANT message with provider/model metadata
6. All results returned in a single response with per-model latency and token counts
7. message.completed published for each successful response
```

Compare / judge / critic now accept `fileIds: string[]` end-to-end (FE picker → parallel orchestration → judge + critic prompts), and each lane writes a per-model `FileDeliveryEntry[]` into the ASSISTANT message's `metadata.fileDelivery` (also surfaced on `ParallelModelResponse.attachmentDelivery`) so the FE can render a delivery-mode chip (`NATIVE_IMAGE` / `EXTRACTED_TEXT` / `OMITTED_NO_VISION` / `OMITTED_UNSUPPORTED` / `TRUNCATED_TEXT`) per model. Slice A also fixed three critical bugs: (1) `FileProcessingManager` was never wired into the parallel path so attachments silently dropped; (2) `ServiceTokenGuard` rejected internal file-content calls from chat-service when the parallel lane re-issued the service token; (3) cloud adapters sent `image_url` parts to Ollama, which silently dropped images — Ollama now receives the native `images: [base64]` shape and cloud lanes keep `image_url`. Full canonical chain in `docs/03-architecture/compare-file-attachments.md`.

---

## Local Ollama Models (auto-pulled on startup)

Only routing-optimized models are auto-pulled. They serve the router pipeline exclusively and **NEVER appear in model selector dropdowns** for end users.

| Model      | Params | Size  | Role               | Best For                               |
| ---------- | ------ | ----- | ------------------ | -------------------------------------- |
| qwen3:1.7b | 1.7B   | 1.1GB | ROUTER (primary)   | Fast, accurate routing classification  |
| phi4-mini  | 3.8B   | 2.2GB | ROUTER (secondary) | Strong reasoning for ambiguous queries |
| gemma3:4b  | 4B     | 3.3GB | ROUTER (fallback)  | Default fallback + memory extraction   |

Default router model: `gemma3:4b` (configurable via `OLLAMA_ROUTER_MODEL`)
Default memory extraction model: `gemma3:4b` (configurable via `MEMORY_EXTRACTION_MODEL`)
Models auto-synced to DB on ollama-service startup.
Auto-pull list configurable via `AUTO_PULL_MODELS` env var (space-separated).

**Rule**: Any model assigned the `ROUTER` role is automatically excluded from the chat model selector. Users browse task-execution models (coding, reasoning, thinking, file-gen) via the Model Catalog.

## Model Catalog (142 Models, 7 Categories)

Users browse and download models from the built-in catalog at `/models/catalog`. Models are organized by category:

| Category         | Highlights                                                                                                  | Runtime        |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| Coding           | Qwen 2.5 Coder 32B/14B/7B, DeepSeek Coder V2 16B, Qwen3-Coder-Next 32B, Devstral 2 24B, Devstral Small 2 7B | Ollama         |
| File Generation  | Qwen 3 7B/14B, Llama 3.3 8B/70B, Mistral Small 3 7B/24B, Phi-4 14B, Gemma 3 9B/27B, Command R+ 104B         | Ollama         |
| Image Generation | SDXL 1.0 Base (recommended), SDXL Turbo, SD 1.5, SD 3.5 Large (Comfy-Org FP8 repack), FLUX.1 Schnell (FP8)  | ComfyUI        |
| Routing          | Qwen 3 0.6B/1.7B, Phi-4-mini 3.8B, SmolLM2 360M/1.7B, Gemma 3 1B/4B, Gemma 4 E2B, TinyLlama 1.1B            | Ollama         |
| Reasoning        | DeepSeek R1 0528/32B/14B/7B/70B, QwQ 32B/72B, Phi-4 14B, Phi-4-mini Reasoning, DeepSeek R1 0528             | Ollama         |
| Thinking         | GLM-5.1, GLM-5, GLM-5-Turbo, GLM-4.7 Thinking, DeepSeek V3.2/V3.1, Gemma 4 31B/26B, Qwen3 80B/235B, Llama 4 | Ollama         |
| General          | Gemma 3/4, GLM-4.7/4.5-Air, Phi-4 Multimodal, Mistral Small 4 22B, Llama 3.3 70B, Qwen 3, Mixtral, Meditron | Ollama/ComfyUI |

### Model Roles

| Role                   | Purpose                             |
| ---------------------- | ----------------------------------- |
| ROUTER                 | Makes routing decisions (AUTO mode) |
| LOCAL_FALLBACK_CHAT    | Default local chat model            |
| LOCAL_CODING           | Specialized for code tasks          |
| LOCAL_REASONING        | Chain-of-thought reasoning          |
| LOCAL_FILE_GENERATION  | Structured output for files         |
| LOCAL_THINKING         | Agentic/search/research tasks       |
| LOCAL_IMAGE_GENERATION | Local diffusion model               |

### Catalog API Endpoints

| Endpoint                              | Method    | Description                 |
| ------------------------------------- | --------- | --------------------------- |
| /api/v1/ollama/catalog                | GET       | Browse catalog with filters |
| /api/v1/ollama/catalog/:id            | GET       | Single catalog entry        |
| /api/v1/ollama/catalog/:id/pull       | POST      | Download model from catalog |
| /api/v1/ollama/pull-jobs              | GET       | List active downloads       |
| /api/v1/ollama/pull-jobs/:id/progress | GET (SSE) | Real-time download progress |
| /api/v1/ollama/pull-jobs/:id          | DELETE    | Cancel download             |

### Dynamic Routing

The router prompt is now built dynamically based on installed models:

- `PromptBuilderManager` fetches installed models from ollama-service internal API
- Groups by category, only includes healthy + installed models
- Cached with 5-minute TTL, invalidated on MODEL_PULLED/MODEL_DELETED events
- Category-aware routing: coding tasks → LOCAL_CODING model, reasoning → LOCAL_REASONING, etc.
- 1650+ detection keywords across 33 capability classes (2274 lines in routing.constants.ts)
- 30 privacy keywords force local routing (zero cloud exposure)
- 5-stage routing pipeline: Privacy → Image → File → Category → Ollama/Heuristic
- 115 models in catalog across 13 domains
- Validated at 99.1% accuracy (150-prompt final validation, 500+ total experiments)

### 33 Capability Classes (1650+ Keywords)

The routing engine classifies messages into 33 capability classes with 1650+ keywords across 2274 lines of routing constants. Below are the top 15 classes by keyword count:

| Class                 | Keywords    | Local Role              |
| --------------------- | ----------- | ----------------------- |
| Coding                | 100         | LOCAL_CODING            |
| Image Generation      | 70+         | LOCAL_IMAGE_GENERATION  |
| Infrastructure        | 33          | LOCAL_CODING            |
| Data Analysis         | 33          | LOCAL_REASONING         |
| Privacy (enforcement) | 30          | Forces local (no cloud) |
| Business              | 30          | LOCAL_FILE_GENERATION   |
| Creative Writing      | 26          | LOCAL_FALLBACK_CHAT     |
| Security              | 25          | LOCAL_CODING            |
| Reasoning             | 21          | LOCAL_REASONING         |
| Legal                 | 21          | LOCAL_REASONING         |
| Medical               | 19          | LOCAL_REASONING         |
| File Generation       | 34          | LOCAL_FILE_GENERATION   |
| Thinking              | 15          | LOCAL_THINKING          |
| Translation           | 12          | LOCAL_FALLBACK_CHAT     |
| General Chat          | 0 (default) | LOCAL_FALLBACK_CHAT     |

Additional 18 classes cover: HR, Education, Sales, Logistics, Hospitality, Science, Government, Finance, Executive, and other specialty domains with dedicated keyword arrays.

## Routing Modes

| Mode           | Behavior                                                                       |
| -------------- | ------------------------------------------------------------------------------ |
| AUTO           | 5-stage pipeline: privacy → image → file → category → Ollama/heuristic         |
| MANUAL_MODEL   | User-selected provider+model (forcedProvider/forcedModel)                      |
| LOCAL_ONLY     | Category-aware: coding→LOCAL_CODING, reasoning→LOCAL_REASONING, else gemma3:4b |
| PRIVACY_FIRST  | Local if healthy, else Anthropic                                               |
| LOW_LATENCY    | OpenAI/gpt-4o-mini                                                             |
| HIGH_REASONING | Anthropic/claude-opus-4                                                        |
| COST_SAVER     | Local if healthy, else cheapest cloud                                          |

Active policies (sorted by priority) can override the mode.

### Routing Replay Lab

`POST /routing/replay` -- re-runs historical routing decisions against the current router configuration. Returns old-vs-new comparison per decision and an aggregated summary (totalReplayed, changedCount, suspiciousCount, averageConfidenceOld/New, labelBreakdown). Managed by `ReplayManager` in the routing service. Frontend page at `/routing/replay` with 3-tab layout: Results, Needs Review, History.

**Replay Lab v2 Endpoints (all under `/api/v1/routing`):**

| Endpoint                         | Method | Description                                             |
| -------------------------------- | ------ | ------------------------------------------------------- |
| `/replay`                        | POST   | Run a replay batch (optional saveRun, runName)          |
| `/replay/runs`                   | GET    | List saved run summaries (paginated)                    |
| `/replay/runs/compare`           | GET    | Compare two runs delta (runId1, runId2 query params)    |
| `/replay/runs/:runId/cases`      | GET    | All cases for a run                                     |
| `/replay/runs/:runId/suspicious` | GET    | Only suspicious cases for a run                         |
| `/replay/runs/:runId/export`     | GET    | Export bundle with claudePrompt for structured analysis |
| `/replay/cases/:caseId/review`   | POST   | Mark confirmed regression + review notes                |
| `/replay/cases/:caseId/promote`  | POST   | Promote to regression test fixture (returns testCode)   |

**Outcome Labels**: `correct_improvement`, `bad_regression`, `cost_win`, `quality_win`, `uncertain`

**Suspicious triggers**: `empty_message_content`, `large_confidence_drop` (≥0.2), `large_cost_increase` (≥2 rank jumps), `route_changed_with_negative_improvement`

**Export Bundle**: includes `claudePrompt` — a structured 3-section analysis prompt (DIAGNOSIS / CODE CHANGES / REGRESSION TESTS) ready to paste into Claude for root-cause analysis.

**Run Comparison**: `RunComparisonResult` includes both run summaries + delta (avgConfNewDelta, avgImprovementDelta, suspiciousCount delta, labelBreakdown delta) + `improved: boolean`.

### Intelligent Routing Rules (AUTO mode)

| Task                           | Routes To                              |
| ------------------------------ | -------------------------------------- |
| Coding, debugging, code review | Anthropic / claude-sonnet-4            |
| Deep reasoning, architecture   | Anthropic / claude-opus-4              |
| Image/video/YouTube/web search | Gemini / gemini-2.5-flash              |
| Math, algorithms               | DeepSeek or local phi3:mini            |
| Creative writing, chat         | OpenAI / gpt-4o-mini                   |
| Simple Q&A, translations       | local-ollama / gemma3:4b               |
| File/data analysis             | Gemini / gemini-2.5-flash              |
| Privacy-sensitive              | local-ollama / gemma3:4b (never cloud) |

---

## Security

- JWT + refresh token rotation (argon2 password hashing)
- RBAC: ADMIN, OPERATOR, VIEWER, USER (AuthGuard + RolesGuard + RequirePermissions on all services)
- Rate limiting: @nestjs/throttler (100 req/min, configurable via THROTTLE_TTL/THROTTLE_LIMIT)
- Helmet security headers on all 17 services
- Zod validation on all DTOs
- Prisma ORM (no raw SQL)
- AES-256-GCM encryption for connector API keys
- Pino log redaction (authorization, password, refreshToken, apiKey, token, secret)
- X-Request-ID correlation from frontend to backend

### Plan feature gates (Plan.allow\* fields, enforced by `@claw/shared-entitlements`)

`allowCompareMode`, `allowJudgeMode`, `allowCriticReview`, `allowResearchMode`,
`allowWorkspaces`, `allowMemory`, `allowContextPacks`. Each plan toggles the
flag; the chat-service `AccessControlService` and the FE `useFeatureGates` hook
read the entitlement payload to gate the corresponding UI/endpoint.
`allowCriticReview` (added 2026-05-30) is a sibling of `allowJudgeMode` — Judge
can be on without Critic, but Critic always requires Judge (DTO refine).

### Permission catalog (`@claw/shared-types` Permission enum)

Source of truth: `packages/shared-types/src/enums/permission.enum.ts`. Key
permissions: `CHAT_*`, `MEMORY_*`, `CONTEXT_PACK_*`, `WORKSPACE_VIEW`,
`WORKSPACE_APP_CONFIG_VIEW`, `WORKSPACE_CONNECT_OWN`, `WORKSPACE_READ_OWN`,
`WORKSPACE_SYNC_OWN`, `WORKSPACE_ACTION_OWN`, `MODEL_USE_ALLOWED`,
`ROUTER_USE`, `COMPARE_USE`, `JUDGE_USE`, `FILES_USE`, `RESEARCH_USE`,
`AGENT_USE`, `MODELS_CATALOG_VIEW`, `VIEW_DASHBOARD`, and the `ADMIN_*`
management permissions. `WORKSPACE_VIEW` + `WORKSPACE_APP_CONFIG_VIEW`
(added 2026-05-30) are narrow read-only permissions: USER can browse the
workspace shell and the admin-created provider-app-configs (sanitised
without `encryptedSecret`) but cannot mutate either — write/delete stays
gated by `ADMIN_WORKSPACE_AUTOMATION_MANAGE`.

### USER role default permission grants

Seeded from `USER_DEFAULT_PERMISSIONS` in
`apps/claw-auth-service/src/common/constants/rbac.constants.ts`: `CHAT_USE`,
`CHAT_READ_OWN`, `CHAT_DELETE_OWN`, `WORKSPACE_VIEW`,
`WORKSPACE_APP_CONFIG_VIEW`, `WORKSPACE_CONNECT_OWN`, `WORKSPACE_READ_OWN`,
`WORKSPACE_SYNC_OWN`, `WORKSPACE_ACTION_OWN`, `MODEL_USE_ALLOWED`,
`AGENT_USE`, `RESEARCH_USE`. Everything else (Memory/Context management
pages, Files, observability, admin) is withheld by default and admin-grantable
per-role via `PUT /api/v1/admin/roles/:id/permissions`.

### Judge + Critic pipeline (chat-service `JudgeRefereeManager`)

When `judgeEnabled=true` on a compare lane (or thread auto-trigger fires), the
manager runs a Critic → Judge two-step on top of the generator response. Critic
prompts come from `CRITIC_SYSTEM_PROMPTS` in `judge-referee.constants.ts`. When
`criticEnabled=true` AND `criticModel` is supplied in the compare DTO,
`resolveCriticTarget()` uses the user-selected model verbatim
(`PROVIDER:model` parsed the same way judge models are) — otherwise it falls
back to the legacy auto-pick. `parseCriticOutput()` tolerates non-JSON critic
output by persisting a `parseFailed=true` marker into
`JudgeRefereeMetadata.criticParseFailed` so the UI can render "critic output
unparseable" without inferring from empty feedback. All critic fields
(`criticModel`, `criticFeedback`, `criticScore`, `criticSummary`,
`criticRequested`, `criticParseFailed`, `criticLatencyMs`) are stored in
`ChatMessage.metadata` under `JudgeRefereeMetadata`. The feature is plan-gated
by `allowCriticReview`; the DTO further enforces `criticEnabled ⇒ judgeEnabled`
and `criticEnabled ⇒ criticModel != ''`.

- **End-to-end local TLS via mkcert** (see `docs/08-runtime-devops/tls-setup.md`):
  browser → nginx :443 → every backend service is HTTPS, with cert
  verification at every hop. Forced on by `scripts/install.{sh,ps1}` Step 6/9
  — no user prompt. `resolveHttpsOptions()` from `@claw/shared-utilities`
  reads `HTTPS_CERT_PATH` / `HTTPS_KEY_PATH` and gracefully falls back to
  HTTP if certs are missing. `NODE_EXTRA_CA_CERTS=/certs/rootCA.pem` makes
  node's global fetch trust the local CA for inter-service hops.

### File Upload Security (FileSecurityManager)

Every file upload goes through 4 security checks before being saved:

1. **Antivirus Scan** — ClamAV Docker container (`clamav/clamav-debian:stable`, port 3310). Files sent via TCP INSTREAM protocol. Graceful degradation if ClamAV is down (fail-safe: rejects).
2. **Magic Byte Validation** — Verifies file content matches declared MIME type (PDF, PNG, JPEG, GIF, WebP, ZIP/DOCX signatures).
3. **Filename Validation** — Blocks path traversal (`../`, `\`, `/`), null bytes, double extensions (`.exe.pdf`), 30+ dangerous extensions (`.exe`, `.dll`, `.bat`, `.ps1`, `.vbs`, etc.).
4. **ZIP Bomb Detection** — Checks for suspicious null byte patterns in archives.

Failed checks → HTTP 422 with reason codes. Filenames sanitized before storage (special chars → underscores).

**Env vars**: `CLAMAV_HOST` (default: `clamav`), `CLAMAV_PORT` (default: `3310`), `CLAMAV_ENABLED` (default: `true`)

---

## Nginx Route Map (port 443 HTTPS → services, port 4000 → 301 → 443)

| Frontend Path            | Backend Service  | Notes                                                                                         |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------------------- |
| /api/v1/auth/\*          | auth:4001        | Login, refresh, logout, me, me/entitlements (self plan+quota)                                 |
| /api/v1/users/\*         | auth:4001        | User CRUD (admin)                                                                             |
| /api/v1/admin/\*         | auth:4001        | Admin RBAC: plans + roles CRUD (ADMIN-gated)                                                  |
| /api/v1/chat-threads/\*  | chat:4002        | Thread CRUD                                                                                   |
| /api/v1/chat-messages/\* | chat:4002        | Message CRUD, feedback, regenerate, parallel compare                                          |
| /api/v1/connectors/\*    | connector:4003   | Connector CRUD, test, sync                                                                    |
| /api/v1/routing/\*       | routing:4004     | Policies, decisions, evaluate, replay                                                         |
| /api/v1/memories/\*      | memory:4005      | Memory CRUD                                                                                   |
| /api/v1/context-packs/\* | memory:4005      | Context pack CRUD                                                                             |
| /api/v1/files/\*         | file:4006        | Upload, list, chunks                                                                          |
| /api/v1/audits/\*        | audit:4007       | Audit logs                                                                                    |
| /api/v1/usage/\*         | audit:4007       | Usage statistics                                                                              |
| /api/v1/ollama/\*        | ollama:4008      | Models, pull, generate                                                                        |
| /api/v1/health           | health:4009      | Aggregated health                                                                             |
| /api/v1/client-logs      | client-logs:4010 | Frontend log ingestion                                                                        |
| /api/v1/server-logs      | server-logs:4011 | Backend log viewer                                                                            |
| /api/v1/images           | image:4012       | Image generation                                                                              |
| /api/v1/file-generations | file-gen:4013    | File export (PDF/DOCX/CSV/etc.)                                                               |
| /api/v1/agent/\*         | agent:4015       | Sessions, terminal commands, repos, file events                                               |
| /api/v1/research/\*      | research:4016    | Dynamic search providers + search runs (Phase 1)                                              |
| /api/v1/llamacpp/\*      | llamacpp:4017    | Local Frontier — catalog, pull jobs (SSE), models, inference (SSE), hardware, runtime, health |

---

## Frontend (Next.js)

### Pages (22)

login, dashboard, chat, chat/[threadId], chat/compare, connectors, connectors/[id], models, models/local, routing, routing/replay, memory, context, files, observability, audits, logs, admin, settings, agent, agent/terminal, agent/repos

### State Management

- TanStack Query: all server state (queries + mutations)
- Zustand: minimal client state (auth, sidebar, log filters)
- React hooks: component-level state

### UI Stack

- shadcn/ui + Radix UI primitives + Tailwind CSS + Lucide icons
- Dark mode via CSS variables, system preference detection
- i18n: 9 languages (EN, AR, DE, ES, FR, HI, IT, PT, RU), RTL support for Arabic
- Mobile responsive (collapsible sidebar, responsive grids)

### Key Chat Components

- `ModelSelector` — grouped dropdown (Auto + provider groups)
- `FileAttachmentPicker` — paperclip button with file checkboxes
- `ContextPackSelector` — checkbox list in thread settings
- `RoutingTransparency` — expandable decision details (confidence, reasons, privacy/cost)
- `MessageBubble` — provider/model badge, feedback, regenerate, token counts
- `MessageComposer` — textarea + model selector + file picker (wraps `RichPromptTextarea`)
- `ThreadSettings` — system prompt, temperature, max tokens, model, context packs
- `ThinkingIndicator` — shown during polling for AI response
- `RichPromptTextarea` — shared autosize/IME-safe shadcn `Textarea` wrapper used by `MessageComposer` AND the in-thread compare panel; logic lives in `use-rich-prompt-textarea` per the no-inline-subcomponent rule
- `use-sticky-bottom-scroll` — chat-thread/compare hook that keeps the scroll container pinned to its sentinel while the user is at the bottom and pauses auto-scroll when scrolled up; renders a "jump to latest" button once paused

---

## Rules and Skills Folders (MANDATORY for all AI agents)

This project has two authoritative folders every AI agent MUST read before acting:

- **`rules/`** — Strict non-negotiable rules: planning gate, backend/frontend architecture, testing mandate, infra checklist, docs requirements, commit format, security. Read the relevant rule file for your task domain.
- **`skills/`** — God-mode operational runbooks: codebase navigation, service scaffolding, feature scaffolding, debug toolkit, QA automation, Docker operations, database toolkit, event bus toolkit.

**Reading order for every task:**

1. `rules/00-master-rules.md`
2. Root `CLAUDE.md` (this file)
3. Service-specific `CLAUDE.md`
4. The relevant `rules/` file for the task type
5. The relevant `skills/` file for the operation type

---

## MANDATORY: Read Before Acting

**Before making ANY change to the codebase — even a one-line fix — you MUST first:**

1. Read `rules/00-master-rules.md`
2. Read this root `CLAUDE.md` — architecture rules, code standards, mandatory checklist
3. Read the service-specific `CLAUDE.md` for whichever service is being modified
4. Read the relevant `rules/` file for your task domain
5. Understand ESLint rules — no inline types, extraction rules, file-specific restrictions
6. Read relevant docs in `docs/` if touching cross-service flows, events, or architecture

**This is not optional. This is the first step of every task. No exceptions.**

## Mandatory Pre-Implementation Checklist

Before writing any code, confirm:

- [ ] `rules/00-master-rules.md` read
- [ ] Root CLAUDE.md read (this file)
- [ ] Service-specific CLAUDE.md read for each affected service
- [ ] Relevant `rules/` file read for task domain
- [ ] docs/16-quality-engineering/PLANNING_STANDARD.md consulted
- [ ] docs/16-quality-engineering/DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md checked
- [ ] Existing related code read (never modify code you haven't read)
- [ ] Test file structure understood for affected services
- [ ] Current Prisma schema read if DB changes needed
- [ ] Current nginx.conf read if new endpoints added
- [ ] Planning gate (Phase 0) document written and saved

## Mandatory Post-Implementation Checklist

After completing any implementation, confirm ALL are done:

**Automated Quality Gates:**

- [ ] npm run typecheck → 0 errors in all affected workspaces
- [ ] npm run lint → 0 errors in all affected workspaces
- [ ] npm run test → all tests pass (≥95% coverage on new code)
- [ ] npm run build → production build succeeds

**Code Quality:**

- [ ] All new pages have: loading state, empty state, error state, success state
- [ ] All form controls use shadcn/ui (no raw select/input/textarea)
- [ ] All page functions have explicit React.ReactElement return type
- [ ] All new text has i18n keys in all 8 locale files
- [ ] All fire-and-forget managers have storeErrorMessage in nested try-catch
- [ ] All poll hooks detect meta?.error === true to stop polling
- [ ] No inline types/enums/consts in restricted files
- [ ] No `any` types introduced

**MANDATORY MANUAL TESTING (see rules/04-testing-rules.md):**

- [ ] QA script written: `qa/test-<feature>.sh`
- [ ] QA script run with 0 failures (20-25 API variations per endpoint)
- [ ] DTO fuzz tests written and passing (boundary/null/empty/overflow cases)
- [ ] DB writes verified via `docker exec ... psql -tAc "SELECT COUNT(*) ..."`
- [ ] Docker logs checked: 0 UnhandledPromiseRejection, 0 FATAL
- [ ] UI tested in real browser: loading / empty / error / success states all verified
- [ ] Dark mode tested (no invisible text, no white flashes)
- [ ] Arabic RTL tested (layout mirrors correctly)
- [ ] Mobile viewport tested (375×812, no overflow)
- [ ] QA evidence documented in `.claude/Integrations/<feature>__QA_output.md`

**Delivery:**

- [ ] All 18 mandatory infra checklist items verified
- [ ] Documentation created or updated (docs/, CLAUDE.md, rules/, skills/)
- [ ] Git commit with conventional commit format

## Docker Container Rebuild Procedure

**When rebuilding a Docker container (especially after shared package changes), ALWAYS follow this exact sequence:**

```bash
# Use the split compose files via shorthand variable (or just call ./scripts/claw.sh services:rebuild)
COMPOSE="-f docker/docker-compose.dev.databases.yml -f docker/docker-compose.dev.services.yml -f docker/docker-compose.dev.ollama.yml"

# 1. Stop the container
docker compose $COMPOSE stop <service-name>

# 2. Remove the container
docker compose $COMPOSE rm -f <service-name>

# 3. Remove the image
docker rmi <image-name>

# 4. Rebuild and start
docker compose $COMPOSE up -d --build <service-name>

# Or, simpler:
./scripts/claw.sh services:rebuild
```

**NEVER skip steps.** Just restarting or using `--build` alone leaves stale compiled code, cached layers, and old `node_modules`. When a shared package (`shared-rabbitmq`, `shared-types`, `shared-constants`, `shared-auth`) is modified, ALL dependent service containers must go through the full stop → rm → rmi → build cycle.

## Docker Compose — `claw.sh` is THE entrypoint

**Single command, auto-detects GPU (NVIDIA / AMD ROCm / Intel-Vulkan / Apple-Metal warn):**

```bash
./scripts/claw.sh up                              # Dev (default), all services + auto-GPU
./scripts/claw.sh --prod up                       # Production, all services + auto-GPU
./scripts/claw.sh down                            # Stop all
./scripts/claw.sh status                          # Show all groups
./scripts/claw.sh gpu                             # Probe GPU detection only (no startup)
```

`claw.sh` orchestrates the split compose files (`docker/docker-compose.dev.{databases,services,ollama}.yml`)
and conditionally layers a per-vendor GPU overlay (`docker/docker-compose.dev.gpu-{nvidia,rocm,vulkan}.yml`)
when the host has the corresponding GPU. It is the **only** supported way to start the stack —
do not invoke `docker compose -f …` directly.

### Per-vendor GPU overlay matrix

| Host GPU                          | Probe                     | Overlay file applied                              | Container gets                                                                      |
| --------------------------------- | ------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| NVIDIA (Linux/WSL2/Win)           | `nvidia-smi -L` succeeds  | `docker/docker-compose.{dev,prod}.gpu-nvidia.yml` | `deploy.resources.reservations.devices.driver=nvidia`, `NVIDIA_VISIBLE_DEVICES=all` |
| AMD ROCm (Linux only)             | `/dev/kfd` exists         | `docker/docker-compose.{dev,prod}.gpu-rocm.yml`   | `devices: [/dev/kfd, /dev/dri]`, `group_add: [video, render]`, `ipc: host`          |
| Intel iGPU / Arc / Vulkan (Linux) | `/dev/dri/render*` exists | `docker/docker-compose.{dev,prod}.gpu-vulkan.yml` | `devices: [/dev/dri]`, `group_add: [video, render]`                                 |
| Apple Silicon Metal               | `uname -s = Darwin`       | (none — warns)                                    | CPU-only inside container; run `claw-llamacpp-service` natively for Metal           |
| None                              | (no probe matches)        | (none)                                            | CPU-only                                                                            |

The `BinaryInstallerManager` queries the GitHub API for the latest llama.cpp release on every container start and matches the right archive per platform key (e.g. `linux-x64-cuda12` → `llama-{TAG}-bin-ubuntu-cuda-*-x64.tar.gz`, `linux-x64-rocm` → `llama-{TAG}-bin-ubuntu-rocm-*-x64.tar.gz`). When you flip GPU passthrough on, the next `claw.sh up` will both expose the GPU to the container AND auto-pull the matching binary build.

All services use `env_file: .env` from root. Single `.env` file for everything.

### Hot Reload Matrix

| Change                | Action                                                    | Downtime |
| --------------------- | --------------------------------------------------------- | -------- |
| Source code (src/)    | Auto-detected by `node --watch`                           | None     |
| Prisma schema         | Rebuild container (`prisma migrate deploy` in entrypoint) | ~30s     |
| package.json deps     | Rebuild container                                         | ~60s     |
| Docker compose config | `docker compose up -d` (recreate)                         | ~10s     |
| .env values           | Restart containers                                        | ~5s      |
| Shared packages       | Rebuild package + restart dependents                      | ~30s     |
| Nginx config          | Restart nginx container                                   | ~2s      |

---

## Environment Variables

Single root `.env` (copy from `.env.example`). Groups:

- General: NODE_ENV, CORS_ORIGINS, THROTTLE_TTL/LIMIT
- PostgreSQL: PG\_\*\_USER/PASSWORD/DB/PORT (7 instances)
- MongoDB: MONGO_USER/PASSWORD/DB/PORT
- Redis: REDIS_URL/PORT
- RabbitMQ: RABBITMQ_USER/PASSWORD/URL/PORT/MANAGEMENT_PORT
- JWT: JWT_SECRET/ACCESS_EXPIRY/REFRESH_EXPIRY
- Encryption: ENCRYPTION_KEY (64 hex chars)
- Admin: ADMIN_EMAIL/USERNAME/PASSWORD
- Frontend: NEXT_PUBLIC_API_URL/APP_NAME/APP_URL, FRONTEND_PORT
- Ollama: OLLAMA_BASE_URL, OLLAMA_ROUTER_MODEL, OLLAMA_ROUTER_TIMEOUT_MS, MEMORY_EXTRACTION_MODEL
- Files: FILE_STORAGE_PATH
- Inter-service URLs: \*\_SERVICE_URL (11 entries)
- Per-service ports: \*\_PORT (12 entries)
- Per-service database URLs: _\_DATABASE_URL/_\_MONGODB_URI (11 entries)
- Image: STABLE_DIFFUSION_URL, IMAGE_SERVICE_URL, IMAGE_PORT, IMAGE_DATABASE_URL
- ComfyUI: COMFYUI_BASE_URL, COMFYUI_PORT, COMFYUI_MODELS_PATH (path inside ollama-service where the shared `comfyui-models-data` volume is mounted so the ComfyUI runtime adapter can drop HuggingFace-downloaded weights for ComfyUI to pick up)
- Model Catalog: AUTO_PULL_MODELS (space-separated list of models to auto-pull on Docker startup)
- Workspace runtime gates (Phase E close-out, 2026-05-02):
  - WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR (default 100) — per-event-type cap on suggestion-factory enqueue rate (Stream 13.3, in-memory sliding window)
  - WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE (default 60) — per-connector cap on incoming webhook delivery rate (Stream 11.4, in-memory sliding window; over-cap returns RATE_LIMITED rejection)
  - AUTO_SUGGEST_INBOX_REPLY_CRON (default `0 */15 * * * *`) — cron for the Gmail INBOX_REPLY collector that emits DRAFT candidates (Stream 12.2)
  - AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS (default 48) — how far back to scan Gmail messages for inbox-reply candidates
- Memory + Context V2 Flagship (2026-05-24, ADRs 033–038, docs/03-architecture/memory-context-integration.md):
  - MEMORY_V2_ENABLED (default true) — master flag for the V2 control center; v1 endpoints stay live regardless
  - CONTEXT_V2_ENABLED (default true)
  - RETRIEVAL_V2_ENABLED (default true) — gates the unified `POST /internal/memories/retrieve` endpoint
  - MEMORY_SENSITIVITY_MODEL (default `gemma3:4b`) — ambiguous-case sensitivity classifier (regex pre-filter ships in V2; Ollama call is a follow-up enhancement)
  - MEMORY_EMBEDDING_MODEL / CONTEXT_EMBEDDING_MODEL (default `nomic-embed-text`)
  - CONTEXT_COMPRESSION_MODEL (default `gemma3:4b`)
  - MEMORY_AUTO_APPROVE_DEFAULT (default 0.85) — per-user `memory_preferences.autoApproveThreshold` default; only fires for sensitivity=NORMAL
  - MEMORY_RETENTION_SWEEP_INTERVAL_MS (default 3600000) — hourly retention sweep
  - MEMORY_SUGGESTION_TTL_DAYS (default 30) — auto-expire pending suggestions
  - CONTEXT_VERSION_RETENTION_COUNT (default 20) — versions kept per pack
  - CONTEXT_TOKEN_ESTIMATOR_MODE (default `char/4`)
  - RETRIEVAL_MEMORY_SEMANTIC_BUDGET (default 5) — top-K memories per retrieval
  - RETRIEVAL_CONTEXT_SEMANTIC_BUDGET (default 12) — top-K pack items per retrieval
  - RETRIEVAL_TOKEN_GUARD_PCT (default 0.4) — fraction of token budget memory+context may consume

---

## Quality Gates

### Pre-Commit Hook (5 steps, all must pass)

```bash
1. prettier --write        # Format staged files
2. npm run lint            # ESLint all workspaces (0 errors required)
3. npm run typecheck       # TypeScript strict (0 errors required)
4. npm run build           # Production build all workspaces
5. npm run test            # All tests pass (312+ tests across 9 services)
```

### CI/CD (GitHub Actions)

4 jobs: lint → typecheck → test → build (build depends on ALL 3 passing)

## Claude Output Requirements

### After Every Implementation Task

Claude MUST produce this output after completing ANY implementation:

1. **Changed files summary** — list every file modified/created with purpose
2. **Affected services** — which services were touched
3. **Test evidence** — run and show test output (pass/fail count)
4. **Lint/typecheck evidence** — show 0 errors
5. **Impacted-area checklist** — confirm each item from the 18-item checklist was checked
6. **Documentation output** — list every doc created or modified, with a 1-line description of what was added
7. **Known gaps** — any known issues, deferred items, or follow-up needed

### Before Claiming "Done"

Claude MUST verify ALL of these before saying a task is complete:

- [ ] npm run typecheck → 0 errors
- [ ] npm run lint → 0 errors
- [ ] npm run test → all pass
- [ ] npm run build → success
- [ ] All 18 mandatory checklist items checked
- [ ] Docs updated or created (Phase 11 documentation checklist completed)
- [ ] No raw HTML elements where shadcn/ui required
- [ ] No `any` types introduced
- [ ] No inline types/enums/constants in restricted files
- [ ] All new user-facing text has i18n keys in all 9 locales
- [ ] Error states (not just happy paths) implemented and testable
- [ ] storeErrorMessage wrapped in try-catch for all fire-and-forget managers
- [ ] emitError called before storeErrorMessage in error paths

### What Claude Must Never Skip

1. Reading CLAUDE.md before starting any task
2. Running typecheck and lint after every change
3. Testing background manager error paths
4. Checking error detection in poll hooks (meta?.error === true)
5. Verifying shadcn/ui usage (no raw select/input/textarea)
6. Confirming explicit return types on all page functions
7. Confirming all 8 i18n locales updated for new text
8. Checking nginx.conf for new endpoints
   8b. **Writing and updating architecture docs** — every new service, feature, or architectural change MUST produce or update docs in `docs/`. No doc = incomplete implementation.
9. **Writing and running a real QA script** (`qa/test-<service>.sh`) — MANDATORY for every new feature
10. **DB verification** — querying the actual database after every write to confirm persistence
11. **Docker log check** — scanning service logs for UnhandledPromiseRejection/FATAL after every test run
12. **Documenting QA evidence** in `.claude/Integrations/<feature>__QA_output.md`

### What Claude Treats as Blockers

These are NEVER acceptable and ALWAYS block delivery:

- TypeScript errors
- ESLint errors
- Test failures
- Raw HTML select/input/textarea in UI
- Inline types/enums/constants in restricted files
- **QA script not written or not run** — every feature requires a `qa/test-<service>.sh`
- **QA tests failing** — 0 failures required before delivery
- **DB verification skipped** — every write must be confirmed in the actual database
- **Docker log errors present** — UnhandledPromiseRejection or FATAL in service logs block delivery
- Missing i18n keys
- Missing error state handling
- storeErrorMessage not in try-catch
- Missing explicit return type on page components

## Commands

```bash
npm run lint               # Lint all
npm run typecheck          # TypeScript check all
npm run build              # Build all
npm run test               # Test all
./scripts/claw.sh up                              # Start dev (auto-GPU)
./scripts/claw.sh down                            # Stop
./scripts/claw.sh logs chat-service               # Follow logs for one service
./scripts/claw.sh status   # Check all service status
```

---

## Complete Software Development Lifecycle

**Every feature implementation MUST follow this exact process from start to finish. No shortcuts.**

**Phase order: 0 (Planning Gate) → 0g (Business Framing) → 1 (Understand) → 2 (Plan) → 3 (Backend) → 4 (SSE) → 5 (Error Handling) → 6 (Frontend) → 7 (Infra) → 8 (Validation) → 9 (E2E) → 10 (Cross-Service) → 11 (Docs) → 12 (QE Gates)**

### Phase 0: Pre-Coding Planning Gate (MANDATORY — Cannot be skipped)

Before writing a single line of code for ANY feature, bug fix, or refactor, you MUST complete this planning gate.

#### 0a. Feature/Bug Brief

Write a 2-sentence plain-language summary:

- What is being built or fixed?
- What user/business problem does it solve?

#### 0b. Impacted-Area Map

Enumerate every dimension that will change:

- Which backend services (by name)?
- Which frontend pages/components?
- Which DB schemas (Prisma/Mongo)?
- Which RabbitMQ events (new/changed)?
- Which API endpoints (new/modified)?
- Which shared packages?
- Which env vars (added/changed/removed)?
- Which Docker compose files?
- Nginx changes?
- CI changes?
- i18n locales?
- Which docs in docs/?

#### 0c. Risk Assessment

For each risk: description → likelihood (LOW/MED/HIGH) → impact (LOW/MED/HIGH) → mitigation

#### 0d. Acceptance Criteria

Numbered, explicit, testable statements. No vague language.
Example: "POST /api/v1/chat-threads returns 201 with `{ id, title, routingMode }`"

#### 0e. Failure Criteria

What must NOT happen. Example: "Original thread messages must NOT be copied."

#### 0f. Test Strategy Seed

Which test types are needed (unit, API, UI, integration, E2E, regression) and why.

**Planning gate output:** All 0a–0f documented before coding starts.

### Phase 0g: Business and Product Framing (MANDATORY for new features)

Before implementing user-facing features:

1. **Business driver**: Why does this exist? What business outcome does it unlock?
2. **User problem**: Who is affected, what pain exists, what outcome improves?
3. **Success metrics**: How is success measured? (quantifiable, observable)
4. **User-visible states**: List every state the user can see (loading, empty, success, error, partial)
5. **Failure state matrix**: Which failures are acceptable (graceful degradation) vs. unacceptable (blockers)?
6. **UAT checklist seed**: Write at least 3 testable user scenarios before coding
7. **"Done" definition**: What does "done" mean from product perspective, not just engineering?

**Product framing gate output:** All 7 items documented.

### Phase 1: Understand the Feature

1. Read the requirements fully before writing any code
2. Identify ALL services that will be affected (backend + frontend + infrastructure)
3. Check the Event Bus table — does this feature need new events?
4. Check the Nginx Route Map — does this feature need new routes?
5. Check the Data Models — does this need schema changes?

### Phase 2: Plan the Implementation

1. List every file that needs to change (controllers, services, repositories, DTOs, types, hooks, components, tests, configs)
2. Determine the order: shared packages → backend → events → frontend → tests → docs
3. Identify cross-service communication needed (HTTP internal endpoints, RabbitMQ events, SSE)

### Phase 3: Backend Implementation

For each affected backend service, follow this exact order:

1. **Prisma schema** — Add/modify models, then `npx prisma migrate dev --name <name>`
2. **Enums** — Add to `src/common/enums/` AND `packages/shared-types` if cross-service
3. **Types** — Add to `src/modules/<domain>/types/<name>.types.ts`
4. **Constants** — Add to `src/common/constants/` or `src/modules/<domain>/constants/`
5. **DTOs** — Create Zod schemas in `src/modules/<domain>/dto/<name>.dto.ts`
6. **Repository** — Pure data access, no business logic, no throw
7. **Service** — Business logic, max 30 lines/method, ownership validation here
8. **Manager** — Complex orchestration only if needed, max 80 lines/method
9. **Controller** — 3-line methods only: extract params, call service, return
10. **Module** — Register new providers/controllers in the module file
11. **Events** — Add event pattern to `packages/shared-types`, publish in service, subscribe in consumers
12. **Tests** — Unit tests for every new service method and DTO

### Phase 4: SSE / Real-time Features (Critical Lessons Learned)

When implementing SSE (Server-Sent Events) endpoints:

1. **Use `@SkipLogging()` decorator** on SSE controllers — pino-http's autoLogging conflicts with SSE streaming, causing "Cannot set headers after they are sent to the client"
2. **Use `@SkipThrottle()`** on SSE endpoints — rate limiting on long-lived connections is wrong
3. **Exclude SSE routes from pino-http autoLogging** in `app.module.ts`:
   ```typescript
   autoLogging: {
     ignore: (req) => req.url?.includes('/stream/') ?? false,
   }
   ```
4. **GlobalExceptionFilter** must check `response.headersSent` before writing error responses
5. **Nginx config** for SSE endpoints MUST have:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Connection "";
   proxy_read_timeout 86400;
   proxy_buffering off;
   proxy_cache off;
   ```
6. **Never use EventSource API** — it cannot set Authorization headers. Use `fetch()` with `ReadableStream` instead (see `src/utilities/sse.utility.ts`)
7. **Never pass JWT tokens in URL query params** — they leak in server logs, browser history, and Referer headers

### Phase 5: Error Handling in Async Flows (Critical Lessons Learned)

When a background/async operation fails (e.g., all LLM providers fail):

1. **Always store an error message in the database** — the frontend polls for new messages; if no message is stored, polling runs forever
2. **Emit SSE error events** so the frontend can react immediately (before the next poll)
3. **Frontend must handle both paths**: SSE error event (fast) AND polling finding the error message (fallback)
4. The error message should be stored as a regular record (e.g., ASSISTANT role with `metadata: { error: true }`) so the frontend's existing polling logic naturally picks it up
5. Never silently swallow errors in RabbitMQ event handlers — at minimum log AND store a user-visible error

### Phase 6: Frontend Implementation

For each frontend change, follow this exact order:

1. **Types** — Add to `src/types/<domain>.types.ts` AND export from `src/types/index.ts`
2. **Enums** — Add to `src/enums/<name>.enum.ts` AND export from `src/enums/index.ts`
3. **Constants** — Add to `src/constants/<name>.constants.ts` AND export from `src/constants/index.ts`
4. **Repository** — Add API call in `src/repositories/<domain>/<domain>.repository.ts`
5. **Query keys** — Add to `src/repositories/shared/query-keys.ts`
6. **Hooks** — Create in `src/hooks/<domain>/use-<name>.ts` (one hook = one responsibility)
7. **Components** — Build in `src/components/<feature>/`, TSX = render only
8. **Page** — Wire in `src/app/(portal)/<route>/page.tsx` with ONE controller hook
9. **i18n** — Add text to ALL 8 locale files
10. **Utilities** — If needed, wrap in `src/utilities/<name>.utility.ts` AND export from index
11. **Tests** — Vitest tests for utilities, hooks, components

### Phase 7: Infrastructure & Config Updates (MANDATORY — every single one)

Check and update ALL of these:

1. **`.env.example`** — add/remove/rename any environment variable with example values
2. **`.env`** — fill the new variable with a working dev value
3. **`scripts/install.sh`** — add the variable to the generated .env block
4. **`scripts/install.ps1`** — same for Windows PowerShell installer
5. **ALL split Docker compose files** — `docker/docker-compose.dev.{databases,services,ollama}.yml`, `docker/docker-compose.prod.{databases,services,ollama}.yml`, plus the per-vendor GPU overlays (`gpu-nvidia`, `gpu-rocm`, `gpu-vulkan` × dev/prod) if your service needs GPU passthrough — if new service, port, volume, database, or AI runtime dependency
6. **`infra/nginx/nginx.conf`** — add upstream + location block for the new service (SSE routes need `proxy_buffering off`)
7. **`packages/shared-constants`** — add service port and service name constants
8. **`packages/shared-types`** — add new event patterns if the service publishes events
9. **`apps/claw-health-service`** — add the new service URL to health check list
10. **`.github/workflows/ci.yml`** — add new service to the Prisma generate loop and test env vars
11. **i18n locale files** — if any new user-facing text (ALL 9 locales: en, ar, de, es, fr, hi, it, pt, ru)
12. **Architecture docs** (`docs/`) — if the change affects documented architecture
13. **Prisma migrations** — if any schema change (`npx prisma migrate dev --name <name>`)
14. **Seed files** — if new default data needed (e.g., catalog entries, default policies)
15. **Test files** — create or update tests for every code change
16. **Frontend types** — sync `src/types/` with backend DTO/schema changes
17. **`CLAUDE.md`** — if adding new services, env vars, patterns, or rules
18. **`apps/claw-frontend`** — update model selectors, types, hooks, and components if user-facing
19. **`scripts/install-tls.{sh,ps1}`** — append the new service's docker hostname to the `HOSTS` array so the next `install-tls` run reissues the leaf cert with that SAN

**Never skip any of these.** A feature is incomplete if any of these are missing.

### Phase 8: Validation (ALL must pass before considering done)

```bash
# 1. TypeScript — 0 errors in ALL changed workspaces
npm run typecheck

# 2. ESLint — 0 errors (warnings OK if pre-existing)
npm run lint

# 3. Tests — ALL pass
npm run test

# 4. Build — production build succeeds
npm run build

# 5. Docker — restart affected services and verify healthy
./scripts/claw.sh services:rebuild                                 # rebuild + start affected service
./scripts/claw.sh status                                            # all groups; must show (healthy)
```

**NEVER skip pre-commit hooks.** The pre-commit hook runs 5 steps:

1. `prettier --write` — format staged files
2. `npm run lint` — ESLint all workspaces (0 errors required)
3. `npm run typecheck` — TypeScript strict (0 errors required)
4. `npm run build` — production build all workspaces
5. `npm run test` — all tests pass

If pre-commit fails, fix the issue and create a NEW commit. NEVER use `--no-verify`.

### Phase 9: Real QA Execution (MANDATORY — Not Optional, Not Skippable)

> **This is not code review. This is hands-on execution.** Every feature MUST be tested by running real curl scripts, real DB queries, and real Docker log inspection. Skipping this is a delivery blocker.

#### QA Script Location

All QA test scripts live in `qa/` (gitignored — NEVER committed to the repo). Each feature gets its own script:

- `qa/test-<service-name>.sh` — API tests + DB verification + Docker log checks

#### QA Script Anatomy (Required Sections)

Every script MUST have ALL of these sections:

```bash
# Section 1: AUTH — get admin JWT token
# Section 2+: Per-feature API tests (happy path + error paths + boundary conditions)
# Section N-1: DATABASE — verify every write operation persisted correctly
# Section N: DOCKER LOGS — verify no UnhandledPromiseRejection or FATAL errors
# Section N+1: SUMMARY — PASS/FAIL count with list of failures
```

#### What Each Test Case Must Verify

For every API endpoint:

1. **Correct HTTP status code** (200/201/400/401/403/404/409/422 — never assume)
2. **Correct response shape** (required fields present, forbidden fields absent)
3. **Security**: sensitive fields like `encryptedTokens`, `passwordHash` MUST NOT appear in responses
4. **Validation**: too-long inputs, missing required fields, invalid enum values → 400
5. **Auth**: unauthenticated requests → 401, wrong-user requests → 403/404

#### Database Verification (Required After Every Write Operation)

After any CREATE, UPDATE, DELETE, or state transition tested via API:

```bash
docker exec <db-container> psql -U <user> -d <db> -tAc \
  "SELECT COUNT(*) FROM <table> WHERE <condition>;"
```

Verify:

- Row count increased/decreased as expected
- Sensitive columns exist in DB (encrypted) even when stripped from API
- Deleted rows are actually gone
- Status transitions reflect in DB (e.g., `EXECUTED` vs `FAILED`)

#### Docker Log Check (Required at End of Every Script)

```bash
ERROR_COUNT=$(./scripts/claw.sh logs <service> 2>&1 | head -200 | \
  grep -cE "UnhandledPromiseRejection|FATAL|Cannot read properties of undefined")
[ "$ERROR_COUNT" -eq 0 ] || echo "FAIL: $ERROR_COUNT critical errors found"
```

#### How to Run

```bash
bash qa/test-<service>.sh
```

All tests must pass (0 failures) before declaring a feature complete.

#### Test Evidence Documentation

After running tests, document evidence in `.claude/Integrations/<feature>__QA_output.md`:

- Test run date and time
- Pass/fail counts
- Any bugs found and their fixes
- DB verification results
- Docker log status

#### E2E API Testing (Original Phase 9 Content)

Test the feature end-to-end using curl or the frontend:

1. **Get a valid JWT token**: `POST /api/v1/auth/login`
2. **Test the happy path**: send a valid request, verify response
3. **Test through nginx** (port 4000): verify nginx routes correctly
4. **Test directly to service** (e.g., port 4002): isolate service issues from nginx issues
5. **Test error paths**: invalid input, missing auth, forbidden access, provider failures
6. **Test async flows**: send message → verify SSE events → verify DB records → verify polling stops
7. **Check service logs**: `docker compose logs <service> --since 1m` for errors

### Phase 10: Cross-Service Flow Verification

For features involving multiple services (e.g., message flow):

1. Verify RabbitMQ events are published: check logs for "Published event: <pattern>"
2. Verify events are consumed: check consumer service logs
3. Verify SSE events reach the frontend (if applicable)
4. Verify database records are created in the correct service's DB
5. Verify audit logging captures the action

### Phase 11: Documentation (MANDATORY — Cannot Be Skipped)

**Documentation is NOT optional. Every feature, bug fix, or enhancement MUST produce or update documentation before the task is considered done. This is non-negotiable.**

For every change, you MUST:

1. **Update `CLAUDE.md`** (root) — add new services, env vars, routes, patterns, or rules
2. **Update or create docs** in `docs/` — if architecture, data models, events, or flows changed:
   - New service → create `docs/04-backend/<service-name>.md` with full architecture description
   - New endpoints → update or create `docs/12-reference/api-reference.md`
   - New events → update `docs/03-architecture/event-bus.md`
   - New routing behavior → update `docs/03-architecture/routing.md`
   - New env vars → update `docs/06-data/environment-variables.md`
   - New Docker changes → update `docs/08-runtime-devops/docker-guide.md`
3. **Update service-specific `CLAUDE.md`** for every service touched
4. **Write architecture explanation** — for every new service or major feature, write a clear narrative:
   - What problem it solves
   - How it fits into the overall architecture
   - Key design decisions and trade-offs
   - Data flow (sequence or narrative)
   - Authentication model
   - Key API endpoints
   - Background jobs / event subscriptions
5. **Update the `docs/00-start-here/` index** if a new category or service was added

**Minimum doc output per new service:**

- `docs/04-backend/<service>.md` — full architecture doc
- `apps/claw-<service>/CLAUDE.md` — service-specific rules

**Minimum doc output per new feature:**

- Updated section in relevant `docs/` file
- Updated `CLAUDE.md` table/section if it changes documented architecture

### Phase 12: Quality Engineering Gates (Mandatory)

Every feature and bug fix MUST pass through the full Quality Engineering lifecycle defined in `docs/16-quality-engineering/`. The phases below are **non-skippable**.

#### QE Phase A — Requirement & Risk Understanding

Before writing code: restate the feature/bug in plain language, identify ALL affected services/pages/DB/events/Docker/env/Nginx/CI/docs, define success/failure/risk criteria.

#### QE Phase B — Baseline Audit

Inspect what already exists: related controller/service/manager/repository methods, existing and missing tests, duplication risk, existing enums/constants/types, docs to update.

#### QE Phase C — Code Review

Review every changed file for: architecture violations, missing DTO/schema validation, missing null/error handling, missing messageKey responses, missing enum usage, missing logging, missing i18n, missing tests, race conditions, security flaws, performance issues, Docker/env/Nginx/doc omissions.

#### QE Phase D — TDD Implementation

Write or update tests as code is written. Define acceptance criteria before finalizing. Ensure no layer is left untested. Ensure changed code is deterministic and observable.

#### QE Phase E — Developer-Side Testing

Before handing off: run unit tests, typecheck, lint, build, targeted API tests, targeted browser checks, inspect logs and DB persistence.

#### QE Phase F — QA Phase

Full quality assurance: feature testing, bug hunting, negative testing, weird-case testing, browser testing, API testing, UI+API integration testing, DB validation, logs validation, event validation, regression testing, system testing, UAT, client-phase testing.

#### QE Phase G — Bug Loop

Collect bugs → classify → reproduce → root cause → fix → unit test fix → re-run browser/API tests → re-run integration → re-run regression → re-run UAT/client checks → repeat until green. No bug is "done" without retest.

#### QE Phase H — Release Readiness

All services healthy, Docker logs clean, Nginx routes correct, DB writes/reads correct, observability signals exist, docs updated, CLAUDE.md updated if patterns changed.

### Quality Engineering Mindset Rules

1. **Never trust a passing happy path alone** — test negative, boundary, and weird cases
2. **Never stop at unit tests** — validate through API, UI, integration, E2E, system, regression, UAT, client layers
3. **Never trust UI state without DB/API truth** — always verify persistence with a subsequent GET
4. **Never trust DB truth without GET/fetch truth** — caches and transforms can lie
5. **Never trust feature isolation without regression** — changes have side effects
6. **Never trust technical correctness without business correctness** — UAT must confirm
7. **Never trust business correctness without client smoothness** — simulate a real non-technical user
8. **A feature is NOT implemented when code compiles** — only when reviewed, tested across all layers, and UAT passes
9. **A bug is NOT fixed when the symptom disappears** — only when root cause is understood, tested, and regressions checked

### Quality Engineering Output Requirements

For every implemented feature or bug fix, produce:

1. Changed files summary
2. Affected services summary
3. Test plan summary
4. Test cases summary
5. Executed test evidence
6. Bug list (if any)
7. Fixes list (if any)
8. Regression summary
9. Docs/config updates summary
10. Release readiness summary

### Quality Engineering Documents

Full standards live in `docs/16-quality-engineering/`:

- `QUALITY_ENGINEERING_OPERATING_SYSTEM.md` — Complete lifecycle definition
- `CODE_REVIEW_AND_PR_REVIEW_STANDARD.md` — Review checklist and PR criteria
- `TEST_CASE_DESIGN_STANDARD.md` — Test case structure, severity, priority, scenarios
- `API_TESTING_STANDARD.md` — Endpoint testing methodology
- `UI_BROWSER_TESTING_STANDARD.md` — Browser testing, dark mode, RTL, stale state
- `INTEGRATION_TESTING_STANDARD.md` — Cross-service flow validation
- `E2E_PLAYWRIGHT_STANDARD.md` — End-to-end journey definitions
- `REGRESSION_TESTING_STANDARD.md` — When and what to regress
- `SYSTEM_TESTING_STANDARD.md` — Docker, Nginx, health, startup verification
- `UAT_STANDARD.md` — Business acceptance validation
- `CLIENT_ACCEPTANCE_TESTING_STANDARD.md` — Non-technical client simulation
- `BUG_TRIAGE_AND_RETEST_STANDARD.md` — Severity model, reproduction, retest rules
- `RELEASE_READY_QUALITY_GATE.md` — Must-pass checks for release
- `TEST_DATA_AND_SEED_STRATEGY.md` — Fixtures, seed data, negative data scenarios
- `OBSERVABILITY_AND_LOG_VERIFICATION_STANDARD.md` — Log, audit, event verification

---

## How to Add a New Local Model

1. **Add to model catalog seed** (`apps/claw-ollama-service/prisma/seed-catalog.ts`):
   ```typescript
   { name: 'model-name', tag: '7b', displayName: 'Model Name 7B',
     category: 'CODING', description: '...', sizeBytes: BigInt(5_000_000_000),
     parameterCount: '7B', runtime: 'OLLAMA', ollamaName: 'model-name:7b',
     isRecommended: false, capabilities: ['code_generation'] }
   ```
2. **Run seed**: `cd apps/claw-ollama-service && npx tsx prisma/seed-catalog.ts`
3. **Update routing constants** if the model has a new category pattern (`apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts`)
4. **Update CLAUDE.md** — add to the Model Catalog table
5. **Update docker auto-pull** if the model should be pre-installed (`.env` → `AUTO_PULL_MODELS`)

## How to Add a New Backend Service

> **MANDATORY DOCKER RULE — NEVER SKIP**: Every new service and every new database MUST be added to the relevant split compose files simultaneously, in the same commit. No exceptions. The split files are:
>
> 1. `docker/docker-compose.dev.databases.yml` — dev: databases only
> 2. `docker/docker-compose.dev.services.yml` — dev: services only
> 3. `docker/docker-compose.prod.databases.yml` — prod: databases only
> 4. `docker/docker-compose.prod.services.yml` — prod: services only
> 5. `docker/docker-compose.dev.ollama.yml` / `docker/docker-compose.prod.ollama.yml` — only if service depends on Ollama
> 6. `docker/docker-compose.dev.gpu-{nvidia,rocm,vulkan}.yml` / `docker/docker-compose.prod.gpu-{nvidia,rocm,vulkan}.yml` — only if service needs GPU passthrough (per-vendor overlay; auto-loaded by `claw.sh`)
>
> **Databases** go into files 1 and 3.
> **Services** go into files 2 and 4.
> **Volumes** must be declared in every file that defines the corresponding service or database.
>
> The legacy "all-in-one" files (`docker/docker-compose.dev.yml`, `docker/docker-compose.yml`) have been **removed**. The canonical entrypoint is `./scripts/claw.sh up` — it stitches the split files and applies the right GPU overlay for the host.
>
> If you add a DB to only one file and not the others, deployment will fail with "container not found".

1. **Copy boilerplate** from closest existing service (e.g., `claw-ollama-service`)
2. **Create PostgreSQL database** in ALL Docker compose files — see mandatory rule above
3. **Add service container** to ALL Docker compose files — see mandatory rule above
4. **Assign port** — next available after 4014 (add to `packages/shared-constants`)
5. **Add env vars** to `.env`, `.env.example`, `scripts/install.sh`, `scripts/install.ps1`
6. **Add nginx route** in `infra/nginx/nginx.conf` (use resolver pattern, not upstream blocks)
7. **Add health check** in `apps/claw-health-service`
8. **Add to CI** in `.github/workflows/ci.yml` — Prisma generate loop + test env vars
9. **Add event patterns** to `packages/shared-types` if the service publishes events
10. **Add frontend types/hooks/pages** if user-facing
11. **Add to ALL 8 i18n locales** if new user-facing text
12. **Update CLAUDE.md** — workspace layout, nginx table, event bus table, env vars section

## How to Add a New Frontend Feature

1. **Types** → `src/types/<domain>.types.ts` + export from `src/types/index.ts`
2. **Enums** → `src/enums/<name>.enum.ts` + export from `src/enums/index.ts`
3. **Constants** → `src/constants/<name>.constants.ts` + export from `src/constants/index.ts`
4. **Repository** → `src/repositories/<domain>/<domain>.repository.ts` (API calls)
5. **Query keys** → `src/repositories/shared/query-keys.ts`
6. **Hooks** → `src/hooks/<domain>/use-<name>.ts` (ONE hook = ONE responsibility)
7. **Components** → `src/components/<feature>/` (TSX = pure render, ZERO hooks)
8. **Page** → `src/app/(portal)/<route>/page.tsx` (ONE controller hook, loading/empty/error states)
9. **i18n** → ALL 8 locale files (`src/lib/i18n/locales/{en,ar,de,es,fr,it,pt,ru}.ts`)
10. **Navigation** → `src/constants/sidebar.constants.ts` + `src/constants/routes.constants.ts`
11. **No inline types/consts/enums** in any .tsx or hook file — extract to dedicated files
12. **No React hooks in .tsx** — only ONE controller hook call per page/component

## Quality Engineering Document Index

Full standards live in `docs/16-quality-engineering/`:

### Process Standards (Phase 0 — Before Coding)

- `PLANNING_STANDARD.md` — Pre-coding planning gate requirements
- `PRODUCT_AND_BUSINESS_FRAMING_STANDARD.md` — Business/product framing requirements

### Code Quality Standards

- `CODE_REVIEW_AND_PR_REVIEW_STANDARD.md` — PR review checklists
- `TDD_AND_UNIT_TESTING_STANDARD.md` — Unit testing requirements and patterns

### Testing Standards (Post-Implementation)

- `TEST_CASE_DESIGN_STANDARD.md` — How to design test cases
- `API_TESTING_STANDARD.md` — API testing methodology
- `UI_BROWSER_TESTING_STANDARD.md` — Browser/UI testing
- `INTEGRATION_TESTING_STANDARD.md` — Cross-service testing
- `E2E_PLAYWRIGHT_STANDARD.md` — End-to-end journey definitions
- `REGRESSION_TESTING_STANDARD.md` — What and when to regress
- `SYSTEM_TESTING_STANDARD.md` — Docker/Nginx/health verification
- `UAT_STANDARD.md` — Business acceptance validation
- `CLIENT_ACCEPTANCE_TESTING_STANDARD.md` — Client-grade simulation
- `OBSERVABILITY_AND_LOG_VERIFICATION_STANDARD.md` — Log/event verification
- `TEST_DATA_AND_SEED_STRATEGY.md` — Test data and fixtures

### Release Standards

- `DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md` — Infrastructure completeness
- `RELEASE_GATES_STANDARD.md` — Release gate framework
- `RELEASE_READY_QUALITY_GATE.md` — Release readiness checklist
- `BUG_TRIAGE_AND_RETEST_STANDARD.md` — Bug severity and retest rules

### Operating System

- `QUALITY_ENGINEERING_OPERATING_SYSTEM.md` — Complete lifecycle definition

---

## Known Gotchas & Hard-Won Lessons

### SSE Streaming

- pino-http `autoLogging` + NestJS `@Sse` = "Cannot set headers" crash. Always exclude SSE routes.
- `LoggingInterceptor` calling `response.setHeader()` also conflicts. Use `@SkipLogging()`.
- Nginx MUST have `proxy_buffering off` for SSE. Without it, events are buffered and never reach the client.
- The SSE location block in nginx MUST come BEFORE the generic service location block (nginx uses longest prefix match, but explicit ordering prevents surprises).

### Fallback & Error Handling

- When all LLM providers fail, you MUST store an error message as an ASSISTANT record. Without it, the frontend's polling condition (`lastMessage.role === ASSISTANT`) is never met, and "AI is thinking..." spins forever.
- The `ChatExecutionManager` emits SSE error events AND throws. The `handleMessageRouted` catch block must store the error message BEFORE re-throwing.
- Frontend polling has a 3-minute max (90 polls at 1s interval) as a safety net.

### Authentication

- Never use `EventSource` API for authenticated SSE — it can't set headers
- Use `fetch()` with `Authorization: Bearer` header instead (see `sse.utility.ts`)
- Token refresh interceptor in `http-client.ts` handles 401 → refresh → retry automatically for REST calls, but NOT for SSE connections

### Docker & Hot Reload

- Source changes in `src/` are auto-detected by `node --watch` — no restart needed
- Shared package changes (`packages/*`) require rebuilding the package AND restarting dependent services
- Prisma schema changes require container rebuild (migration runs in entrypoint)
- Nginx config changes require `docker compose restart nginx`

### Testing

- Frontend tests may fail on the host due to rollup native binary issues with Node.js v24+. Run inside Docker or use the vitest process cache.
- Backend tests run with Jest, frontend with Vitest — different APIs
- Test files (`*.spec.ts`, `*.test.ts`) have all ESLint restrictions OFF

### Local Vision Attachments (LOCAL_ONLY / PRIVACY_FIRST)

- Per-model vision: Ollama models default `supportsVision=false` unless name matches `OLLAMA_MULTIMODAL_MODEL_PATTERNS` (llava, bakllava, moondream, minicpm-v, cogvlm, llama3.2-vision, _-vision, _-multimodal).
- `LOCAL_ONLY` / `PRIVACY_FIRST` modes drop image attachments if no local vision model is installed (configurable via `ALLOW_LOCAL_ONLY_ATTACHMENTS_WITHOUT_VISION`). The user is warned with the `chat.localOnly.imagesDropped` i18n key.
- Detection timeout is bounded by `LOCAL_VISION_MODEL_DETECTION_TIMEOUT_MS` (default 3000 ms); on timeout we treat the registry as having no vision model and warn the user instead of silently forwarding images to a text-only model.

### File retention + ZIP archive guardrails (Slice C foundation 3)

- The file-service runs a nightly retention sweep via NestJS `@nestjs/schedule` driven by `FILE_RETENTION_SWEEP_CRON` (default `'0 2 * * *'`). It deletes `File` + `FileChunk` rows older than `FILE_RETENTION_DAYS` (default 30) in batches of `FILE_RETENTION_SWEEP_BATCH_LIMIT` (default 100). Set `FILE_RETENTION_DAYS=0` to disable.
- Cron-sweeper pattern: query expired rows → delete blob from disk → cascade-delete chunks via Prisma → delete `File` row → emit structured log per row with `requestId=retention-sweep-<runId>`. Failures to remove the blob are logged as `warn` but the DB row still goes — never leave orphan rows.
- ZIP uploads validate against `ZIP_MAX_NESTING_DEPTH` (default 5), `ZIP_MAX_ENTRY_COUNT` (default 10000), `ZIP_COMPRESSION_RATIO_THRESHOLD` (default 1000), and `ZIP_MAX_EXTRACTED_SIZE_MB` (default 500) BEFORE extraction. Validation order is fixed; any violation surfaces `files.zip.bombRejected` to the user. Extraction sandbox `ZIP_TEMP_EXTRACTION_PATH` (default `/tmp/claw-zip-extraction`) is mounted as a 1 GB tmpfs in both dev + prod docker compose so a bomb attempt can never fill the host disk.
- See `docs/04-backend/service-guide-file.md` and ADR `docs/13-adr/053-file-retention-and-zip-guardrails.md`.

---

## Documentation System

Full documentation lives in `docs/` organized by layer:

```
docs/
  00-start-here/          # Index, onboarding, system overview
  01-executive-context/   # Product vision, business overview
  02-business-product/    # Personas, features, user journeys
  03-architecture/        # System architecture, message flow, routing, events, security
  04-backend/             # Services index, controllers reference, coding standards, shared packages
  05-frontend/            # Frontend architecture, coding standards
  06-data/                # Database reference, environment variables
  07-integrations/        # AI provider catalog
  08-runtime-devops/      # Docker guide, CI/CD, nginx reference
  09-testing/             # Testing strategy
  10-uat-acceptance/      # UAT guide, business acceptance
  11-runbooks/            # Troubleshooting, operational runbooks
  12-reference/           # API reference, error catalog
  13-adr/                 # Architecture Decision Records
  14-risk-debt/           # Technical debt, risk register
  15-ai-context/          # AI agent context pack, codebase navigation
  16-quality-engineering/ # QE lifecycle, test standards, release gates, bug triage (20+ documents)
```

---

## The ClawAI Engineering Mindset (MANDATORY for every AI agent — Claude, Codex, Cursor, any other)

**This section is the north star.** Every AI agent working on this codebase — Claude Code, OpenAI Codex, Cursor, or any other — MUST adopt and enforce these mindsets. They are not optional, aspirational, or situational. They apply to every task, every change, every commit.

### 1. Planning-first mindset

- Never write a single line of code without a written plan.
- Phase 0 (requirement + risk + acceptance + failure criteria) is non-skippable.
- If you cannot state the business driver and success metric in one sentence, you do not understand the task.
- Plan → confirm scope → write tests → implement → verify.
- Plans belong in `.claude/Integrations/<feature>__PLAN.md` or the equivalent location for your tool.

### 2. TDD mindset (Test-Driven Development)

- Write failing tests BEFORE writing implementation code.
- Every utility, classifier, normalizer, manager, service, repository, hook, and component has a test file co-located in `__tests__/`.
- Test cases must cover: happy path, boundary conditions, null inputs, empty inputs, error inputs, duplicate inputs, concurrent inputs, and malformed inputs.
- A feature is not built until its tests run and pass.
- Target 98%+ test coverage on all new code. Skip only trivial getters.

### 3. Experimentation mindset

- When the path is unclear, write a throwaway experiment first — inside `.claude/Integrations/experiments/`.
- Validate the approach on 1 small case before scaling to 50.
- If the Ollama scraper picks up CSS classes as tags, fix the parser before onboarding 500 models.
- Every manager and utility should be testable in isolation with a small, obvious example.

### 4. Audit-first mindset

- Before building, read. Before rewriting, audit.
- Understand what exists: schema, existing services, existing tests, existing patterns.
- Reuse patterns (repository → service → manager, adapter factory, SSE subjects, etc.).
- Never introduce a second way to do what the codebase already does once.

### 5. Business-product mindset (productifying)

- Every technical change must connect to a business outcome.
- "What user pain does this fix? What business metric does this move?" — answer these before coding.
- Write the feature summary for a non-technical product manager, not a reviewer.
- Check the product roadmap, feature catalog, and personas before proposing scope.

### 6. QA and intensive testing mindset

- Unit tests are the floor, not the ceiling.
- For every feature, write a `qa/test-<feature>.sh` script that covers:
  - Auth
  - Every endpoint (happy + 400 + 401 + 403 + 404 + 409)
  - DTO validation
  - DB verification via `docker exec … psql -tAc`
  - Docker log check (no `UnhandledPromiseRejection`, no `FATAL`)
- The script must pass 0 failures before the feature is declared done.
- QA is not optional and cannot be skipped.

### 7. Manual API testing mindset

- After writing the QA script, test each endpoint MANUALLY in a second terminal with curl.
- Verify response shape, status code, error codes, headers.
- Test boundary values: 0-length strings, max-length strings, nulls, negatives, enum mismatches.
- Verify pagination, sorting, filtering each work independently.

### 8. Manual UI testing mindset

- After the backend passes QA, test the UI MANUALLY in a real browser.
- Test the golden path end-to-end.
- Test loading, empty, error, and success states for every screen.
- Test RTL mode with Arabic locale.
- Test dark mode.
- Test mobile viewport.
- Test accessibility (tab order, focus rings, aria labels).

### 9. UAT (User Acceptance Testing) mindset

- Ask: "Does a non-technical user understand this feature?"
- Simulate real user workflows, not happy paths.
- Click the wrong buttons. Type the wrong input. Refresh mid-flow.
- A feature passes UAT only when a first-time user can complete the golden path without documentation.

### 10. Bug-free mindset

- Blockers block delivery. Full stop.
- A lint warning is not a blocker. A lint error is.
- A TypeScript error is a blocker.
- A failing test is a blocker.
- An `UnhandledPromiseRejection` in Docker logs is a blocker.
- A 500 on any tested endpoint is a blocker.
- Never use `--no-verify` to bypass hooks. Never mark a task "done" with known bugs.

### 11. Coverage mindset

- Target ≥98% test coverage on new code.
- Run `npm run test:cov` before committing.
- If coverage drops, add tests before merging.
- Coverage is a proxy for "did you actually think about edge cases?"

### 12. Wiring-everything mindset

- Every new service must be wired into:
  - All 7 Docker compose files (not just one)
  - Nginx reverse proxy
  - Health service aggregator
  - `packages/shared-constants` (port + name)
  - `packages/shared-types` (event patterns if publishing)
  - `.env` and `.env.example`
  - `scripts/install.sh` + `scripts/install.ps1`
  - `.github/workflows/ci.yml`
  - i18n (all 9 locales) if user-facing
  - `docs/04-backend/services-index.md`
  - `CLAUDE.md` workspace layout
  - Frontend types, hooks, and pages if user-facing
- A feature is incomplete if any of these are missing.

### 13. No-missing-requirements mindset

- Re-read the user's request 3 times before starting.
- List every verb and every noun in the request as a checklist.
- Map each to an acceptance criterion.
- If something in the request is ambiguous, ask or assume-and-state.
- Don't declare "done" until every item in the original request is checked off.

### 14. Observability mindset

- Every service-level action must log with structured fields.
- Every event must be auditable.
- Every background job must emit a correlation ID.
- Never silently swallow errors. Log, rethrow, or handle explicitly.
- The user who opens Docker logs at 2 AM must be able to trace a request end-to-end.

### 15. Idempotency mindset

- QA scripts must be re-runnable without breaking.
- Migrations must be additive, not destructive.
- API operations must tolerate retries.
- If a side effect could happen twice, design for it.

### 16. Documentation mindset (MANDATORY — non-skippable)

- Every feature must produce or update docs. No exception.
- New service → `docs/04-backend/service-guide-<name>.md`
- New pipeline → `docs/07-integrations/<pipeline>.md` or `docs/03-architecture/<topic>.md`
- New env var → `docs/06-data/environment-variables.md`
- New endpoint → `docs/12-reference/api-reference.md`
- Update `CLAUDE.md` root for any new service, env var, pattern, or mindset rule.
- Update `codex.md` and `cursor.md` so other AI agents follow the same mindset.
- A feature is incomplete if docs are missing or stale.

### 17. Root-cause mindset

- A bug is not fixed when the symptom disappears.
- A bug is fixed when the root cause is understood, tested, and regression-protected.
- If you bypass a failing test, you have not fixed anything.

### 18. Reversibility mindset

- Prefer reversible actions (new commit) over irreversible (amend, force-push, drop table).
- Confirm before: `git push --force`, `rm -rf`, `DROP TABLE`, `git reset --hard`, `kubectl delete`.
- Destructive actions are last resort, never shortcuts.

### 19. Least-code mindset

- Delete more than you add.
- Reuse patterns. Don't abstract prematurely.
- 3 similar lines are better than 1 abstraction nobody reads.
- Comments explain WHY, not WHAT. The code explains WHAT.

### 20. Honest-status mindset

- Don't claim "done" until done.
- Don't hide test failures. Don't hide lint warnings that became errors.
- Don't claim 98% coverage if you skipped the manager's error path.
- If something is incomplete, say so in plain English.

### 21. Logging-coverage mindset (added 2026-04-26)

- Every public method in a `*.service.ts`, `*.manager.ts`, `*.adapter.ts`, `*.utility.ts`, `*.repository.ts` MUST emit at least:
  - `logger.debug(...)` on entry (with non-PII inputs only)
  - `logger.error(...)` in every `catch` block (before rethrow or fallback)
  - `logger.info(...)` for any side-effecting operation (DB write, HTTP call, RabbitMQ publish, file write)
  - `logger.warn(...)` for any retry, fallback, or recoverable degraded path
- A method with zero log statements is a delivery blocker and must be rejected in code review.
- All logs ship automatically to MongoDB via the existing Pino → RabbitMQ `log.server` → `claw-server-logs-service` pipeline (TTL 30 days). NO additional plumbing required per service.
- Never log secrets, tokens, passwords, refresh tokens, API keys, or full request/response bodies that may contain them. Pino redaction config is already in place — extend it, don't bypass it.
- Use NestJS `Logger` (`private readonly logger = new Logger(MyClass.name)`). Never `console.log`. `console.warn` and `console.error` are tolerated only at top of `main.ts` for bootstrap errors.

### 22. Test-coverage flagship mindset (added 2026-04-26)

- Every microservice and the frontend MUST report **≥92 %** coverage on all four jest/vitest metrics: statements, branches, functions, lines.
- Threshold is enforced via `coverageThreshold` in each `jest.config.ts` / `vitest.config.ts` and verified in CI by running `npm run test -- --coverage`.
- Coverage is ratcheted, never lowered: if your change drops a service below its existing threshold, you fix the test gap before merging.
- Test quality bar:
  - No `.toBeDefined()`-only assertions (assert behaviour, not existence)
  - No `xit`, `xdescribe`, `.skip()` (CI rejects)
  - Mocks at boundaries only (DB, HTTP, RabbitMQ, ClamAV, Ollama). Never mock the unit under test.
  - DTO fuzz tests for every Zod schema (valid + boundary + invalid + null/empty/overflow)
  - Manager error-path tests required (every `catch` branch covered)
- Tests live next to the code in `__tests__/`. Backend uses Jest (`.spec.ts`), frontend uses Vitest (`.test.ts` or `.spec.ts`).

### 23. Shared-utilities-first mindset (added 2026-04-26)

- Before writing a utility in `apps/<service>/src/common/utilities/`, search `packages/shared-utilities/`. If it exists there, IMPORT IT — never copy-paste.
- If a utility lives identically in 2+ services, it is a bug. Move it to `packages/shared-utilities/` and replace per-service copies with imports.
- Per-service utilities are reserved for service-specific glue. Anything domain-neutral (HTTP, JWT verification, crypto primitives, URL safety, regex helpers, retry policies, exponential backoff, time helpers, encoding helpers) lives in `packages/shared-utilities/`.
- Cross-service constants live in `packages/shared-constants/`. Cross-service types live in `packages/shared-types/`. Cross-service utilities live in `packages/shared-utilities/`. The three packages cover types / values / functions respectively.

### 24. Inline-extraction mindset (added 2026-04-26)

- Zero inline declarations in any logic file (`*.service.ts`, `*.manager.ts`, `*.controller.ts`, `*.repository.ts`, `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`, `*.pipe.ts`, `*.module.ts`, `*.interceptor.ts`):
  - inline `type` / `interface` → `src/modules/<domain>/types/<name>.types.ts` (or `src/common/types/`)
  - inline `enum` → `src/common/enums/<name>.enum.ts`
  - inline `const` (top-level, non-Logger) → `src/common/constants/<name>.constants.ts` or `src/modules/<domain>/constants/<name>.constants.ts`
  - standalone `function` declarations → `src/common/utilities/<name>.utility.ts`
  - string-literal-union types (`'a' | 'b' | 'c'`) → enum in `src/common/enums/`
  - `as unknown as X` casts → real types or refactor (banned by ESLint `no-restricted-syntax`)
- Only exception: `private readonly logger = new Logger(MyClass.name)` inside NestJS classes (the standard NestJS pattern).
- Index files (`src/types/index.ts`, `src/enums/index.ts`, `src/constants/index.ts`, `src/utilities/index.ts`, etc.) re-export everything for ergonomic imports.

### 25. Method-size discipline mindset (added 2026-04-26)

- Service method ceiling: **50 lines / complexity 10**. Hard error in Phase U.
- Manager method ceiling: **80 lines / complexity 15**. Hard error in Phase U.
- File ceiling: **500 lines** for all production files (excluding `*.constants.ts`, locale files, generated catalogs).
- A method exceeding its ceiling MUST be split. Extraction targets:
  - Validation logic → private helper
  - Transformation logic → private helper or utility
  - External-call orchestration → manager helper
  - Pure computation → utility file (cross-service if reusable)
- A file exceeding 500 lines MUST be split into multiple files in the same directory or extracted into sub-managers/sub-services.

### 26. Extend-don't-parallelize mindset (added 2026-05-30)

- When the codebase ALREADY ships a layer that solves the problem class (auth pipeline, RBAC, RabbitMQ event bus, SSE rich-progress, http-client retry, repository pattern, capability framework, etc.), **EXTEND that layer** rather than build a second one.
- The audit-first mindset (rule 4) tells you to read first; this rule tells you what to do once you've read: identify the seam, extend through the seam, do NOT introduce a parallel system that re-implements 80% of what already exists.
- Concrete examples in this codebase:
  - Local-runtime rich-progress (PR1, 2026-05-30) extends `ChatStreamService` + `ProviderStreamExecutor` + the existing `@Sse('stream/:threadId')` channel rather than creating a new `claw-runtime-stream-service` and a new SSE endpoint. See `docs/LOCAL_RUNTIME_PROGRESS_ADR.md`.
  - The desktop-agent capability framework (Stream 10) extends `AccessPolicy` rather than introducing a parallel `CapabilityPolicy` table.
  - `@claw/shared-utilities` consolidated per-service `jwt.utility.ts`, `http-client.utility.ts`, `crypto.utility.ts` rather than letting each service keep its own copy.
- If you find yourself writing "a new service that does X but for Y", stop and ask: is there a seam in the existing X-doer that lets me extend it for Y? Almost always the answer is yes.
- Acceptable reasons to build parallel: (a) the existing system is on a deprecation path, (b) the new use case has fundamentally incompatible constraints (different data shape that cannot be subsetted, different security boundary, different SLA), (c) the existing system would be doubled in surface area by accommodating the new case. All three should be challenged in code review.
- When extending, the trade-off pattern is usually: one wider envelope vs N narrow per-case envelopes. The wider envelope wins almost every time — it consolidates client code, lets receivers ignore optional fields, and keeps the mental model "one channel, one contract."

---

**These 26 mindsets are the default operating mode.** Any AI agent that does not follow them is doing it wrong. Any code reviewer seeing a violation should block the merge.

---

## Codebase-Wide Refactor Standards (2026-04-26)

This section codifies the rules introduced by the codebase-wide refactor (Phase B of `.claude/Integrations/refactor__PLAN.md`). Every future change MUST comply.

### Banned patterns (ESLint enforced via `no-restricted-syntax`)

- `as unknown as X` (use real types)
- `console.log`, `console.debug`, `console.info`, `console.trace` (use NestJS `Logger`)
- `let` at module scope (use `const` or move state into a class)
- inline `interface`/`type`/`enum`/`function` in logic files (extract per rule 24 above)
- string-literal union types (use enums per rule 23)

### File-size thresholds

| File class     | Soft (warn) | Hard (error in Phase U) |
| -------------- | :---------: | :---------------------: |
| Service method |  50 lines   |        50 lines         |
| Manager method |  80 lines   |        80 lines         |
| Service file   |  300 lines  |        500 lines        |
| Manager file   |  500 lines  |        500 lines        |
| Adapter file   |  500 lines  |        500 lines        |
| Utility file   |  300 lines  |        300 lines        |

### Coverage thresholds (per-service `jest.config.ts` / `vitest.config.ts`)

```ts
coverageThreshold: {
  global: { statements: 92, branches: 92, functions: 92, lines: 92 }
}
```

CI fails if any metric drops below 92 %. Do not lower the threshold to land a change.

### Required logging signatures (per public method)

```ts
async doX(input: Input): Promise<Output> {
  this.logger.debug(`doX: input=${safeStringify(input)}`);
  try {
    const result = await this.somethingThatMightFail(input);
    this.logger.info(`doX: completed thingId=${result.id}`);
    return result;
  } catch (error) {
    this.logger.error(`doX: failed — ${(error as Error).message}`);
    throw error;
  }
}
```

`safeStringify` redacts known sensitive fields (token, password, apiKey, refreshToken, secret, authorization). Use `JSON.stringify` only when fields are guaranteed safe.

### Cross-service utility location rule

- `packages/shared-types/` — TypeScript types and event payloads shared by 2+ services
- `packages/shared-constants/` — values shared by 2+ services
- `packages/shared-utilities/` — functions shared by 2+ services (jwt-verifier, http-client, crypto, url-safety, retry-policy, etc.)
- `packages/shared-rabbitmq/` — RabbitMQ module + service (already exists)
- `packages/shared-auth/` — Auth guards/decorators (already exists)

### Refactor execution recipe (per-service phase template)

When refactoring an existing service:

1. Read the service `CLAUDE.md` and existing source.
2. Adopt shared-utilities — replace local `jwt`/`http-client`/`crypto` with imports from `@claw/shared-utilities`. Delete local copies.
3. Extract every inline declaration per rule 24.
4. Replace string-literal unions with enums.
5. Split every method over the ceiling (rule 25). Extract helpers; reusable ones move to utility files.
6. Enrich logging on every public method (rule 21).
7. Backfill tests to ≥92 % coverage. DTO fuzz, error paths, boundary cases.
8. Run gates: `npm run lint && npm run typecheck && npm run test -- --coverage && npm run build`. All green.
9. Run `qa/test-<service>.sh`. 0 failures required.
10. Rebuild Docker container. Scan logs for `UnhandledPromiseRejection|FATAL`. 0 hits.
11. Update service `CLAUDE.md` if patterns changed; update `docs/04-backend/<service>.md` if architecture changed.
12. Commit: `refactor(<service>): adopt shared-utilities, extract inline declarations, split long methods, enrich logging, backfill tests to 92%`.

### Things to NEVER do (post-refactor)

- Reintroduce a per-service `jwt.utility.ts` after dedup
- Reintroduce inline `type`/`interface`/`enum`/`const` in logic files
- Reintroduce string-literal unions for domain values
- Skip logging in a public method ("the method is too small to need it" — there is no such method)
- Lower a `coverageThreshold` to land a change
- Reintroduce a method >50 lines (service) or >80 lines (manager)
- Reintroduce a file >500 lines
- Use `console.log` anywhere, ever (`console.warn`/`console.error` only in `main.ts` bootstrap)
- Use `as unknown as X` to satisfy the type checker
- **Add a new `packages/<name>` workspace without also adding the corresponding `cd ../<name> && npx tsc` line to ALL FOUR jobs in `.github/workflows/ci.yml` "Build shared packages" step** (see CI Workflow Footgun below)

### CI Workflow Footgun (added 2026-04-27)

**Scope clarification:** this rule applies ONLY when you add a NEW top-level `packages/<name>/` workspace (its own `package.json`, its own `@claw/<name>` entry in the root workspaces array). Subfolders inside an existing `packages/<name>/` (e.g. `packages/shared-utilities/runtime-progress/`) are covered automatically by the parent package's existing CI entries — no ci.yml edits are needed for subfolder additions.

When adding a new package under `packages/`, you MUST update `.github/workflows/ci.yml` "Build shared packages" step in **all four jobs** (lint, typecheck, test, build):

```yaml
- name: Build shared packages
  run: |
    cd packages/shared-types && npx tsgo -p tsconfig.build.json
    cd ../shared-constants && npx tsgo -p tsconfig.build.json
    cd ../shared-rabbitmq && npx tsgo -p tsconfig.build.json
    cd ../shared-auth && npx tsgo -p tsconfig.build.json
    cd ../shared-utilities && npx tsgo -p tsconfig.build.json       # added Phase C-1 of refactor
    cd ../<new-shared-package> && npx tsgo -p tsconfig.build.json   # MUST add for any new shared package
```

**SECOND required edit (added 2026-05-29):** you MUST also add the new package to the per-package **matrix** in all four jobs of `.github/workflows/ci.yml`, otherwise the package's OWN lint/typecheck/test never runs in CI (it only gets built as a dependency). Add an entry next to `shared-utilities` in each job's `strategy.matrix.include`:

```yaml
- service: <new-shared-package>
  workspace: '@claw/<new-shared-package>'
  prisma: false
```

So adding ANY `packages/<name>` workspace requires TWO edits per job × 4 jobs in ci.yml: (1) the "Build shared packages" `cd ../<name> && npx tsgo ...` line, and (2) the `strategy.matrix.include` entry above.

**Why it bites:** local builds work because `node_modules/@claw/<pkg>` is a symlink populated by `npm install`, and `dist/` is created by the developer's local `npm run build`. CI starts from a fresh checkout where `dist/` doesn't exist — consumer services fail with `Cannot find module '@claw/<pkg>'` even though `package-lock.json` lists the package. And a package missing from the matrix is silently never lint/typecheck/tested in CI.

This footgun cost a CI red on the first commit after adding `@claw/shared-utilities` (caught and fixed in commit `ad38ccf`). `@claw/shared-entitlements` was added to the build step in Phase C-1 but its matrix entry was missed until 2026-05-29 — its own lint/typecheck/test silently never ran in CI. Full rule in `rules/05-infra-rules.md` and `docs/04-backend/shared-packages.md`. Future agents: don't repeat — both edits, all four jobs.

---

## Desktop Agent Flagship — Capability Framework (added 2026-04-26)

The desktop agent (claw-agent-service) is being expanded from terminal commands to a full **capability framework** that covers filesystem, process, browser, screen, clipboard, application, audio, and recipe-step actions through a single approval / risk / audit pipeline. See:

- Plan pack: `plan-prompts/clawai_desktop_agent_flagship/` (21 self-contained Sonnet prompts)
- Implementation progress: `docs/15-ai-context/desktop-agent-flagship-implementation-progress.md`
- Vision: `docs/02-business-product/desktop-agent-vision.md`
- Catalog: `docs/02-business-product/desktop-agent-feature-catalog.md` (~134 features)
- UAT: `docs/10-uat-acceptance/desktop-agent-uat.md` (~79 stories incl. 6 adversarial)
- ADRs: 029 (capability framework), 030 (filesystem), 031 (process), 032 (recipes)

### What this changed

- **New table `CapabilityInvocation`** (apps/claw-agent-service/prisma/schema.prisma) is the unified record for every approval-gated agent action across all classes. 12-state lifecycle including `ROLLED_BACK` and `ROLLBACK_FAILED`.
- **5 new enums** in `apps/claw-agent-service/src/common/enums/`: CapabilityClass, CapabilityOperation, CapabilityBlastRadius, CapabilityReversibility, CapabilityInvocationStatus.
- **`AccessPolicy` extended additively** with `capabilityClass`, `capabilityOperation`, `targetMatcherJson`, `autoApproveMaxRiskScore`, `requireReason`, `isSystemDefault`. Existing terminal-command policies stay valid (null capabilityClass = legacy).
- **Default policy seeds** at `apps/claw-agent-service/src/common/constants/capability-policy.constants.ts` — 18 system defaults today (10 filesystem + 8 process + 1 catch-all), more appended per stream as classes ship.
- **12 new RabbitMQ events** (table above) consumed by audit-service.
- **Recipe DSL** at `apps/claw-agent-service/src/modules/recipes/dto/recipe-dsl.dto.ts` with safe expression evaluator at `apps/claw-agent-service/src/common/utilities/recipe-expression.utility.ts` — handwritten 500-LOC parser, NO eval / vm / new Function, supports only `$params.x`, `$steps.id.output.path`, comparison, boolean ops, `~=` regex match.

### What has landed end-to-end (2026-05-01)

- **Stream 10**: full backend (controllers/services/managers/repos/migration/policy seeds), CLI capability-runner with TERMINAL provider stub, frontend types/repository/hooks, audit-service consumer for 12 capability events, dual-write window from CommandRiskService. Live QA `qa/test-stream-10-capability-framework.sh`: 28/28.
- **Stream 11**: FILESYSTEM CLI provider (`agent-cli/src/capability-providers/filesystem/index.js`) — 8 ops (READ/WRITE/APPEND/MOVE/COPY/DELETE/LIST/STAT) with absolute-path validation, traversal rejection, undoPlan capture, smoke 17/17.
- **Stream 12**: PROCESS CLI provider (`agent-cli/src/capability-providers/process/index.js`) — 4 ops (SPAWN/KILL/LIST/INSPECT) with absolute-binary-path validation, signal allow-list, cross-OS process listing.
- **Stream 13 (CRUD half)**: Recipe + RecipeRun + RecipeRunStep schema, `recipes/` NestJS module with full CRUD (controller / service / repo / DTOs), 8 unit tests, live QA `qa/test-stream-13-recipes-crud.sh`: 16/16.

### What still needs implementation

Stream 13 RUNNER (event-driven step DAG executor) and streams 20-42 (browser, screen, clipboard, application, audio capability providers; Tauri shell; UX dashboards; fleet admin; activity memory; marketplace), plus stream 50 master QA harness and stream 60 runbooks. Defer-list with reasons in the master plan doc.

### Hard rules added (desktop-agent-specific blockers)

8. Every new capability MUST have a DeviceScope, ≥1 default AccessPolicy, and a RabbitMQ event consumed by audit. No silently allowed actions.
9. Every CLI-side capability MUST have manual cross-OS evidence captured to `.claude/Integrations/cross-os-evidence/<date>-<stream>-<os>.md`.
10. Every irreversible capability MUST record `metadata.noUndoReason` text OR a typed `undoPlan` in the CapabilityInvocation row at completion time.
11. Local-first-by-default: activity memory, OCR results, screenshot blobs stay on the user's machine unless an explicit per-record cloud-sync flag is flipped.
