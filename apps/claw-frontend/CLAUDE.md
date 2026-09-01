# Claw Frontend - Development Rules & Standards

## Architecture Pattern

```
View (TSX) -> Controller (Hook) -> Service -> Repository/API
```

- **View (.tsx):** Pure render composition. No logic, no hooks (except controller hook), no fetch calls.
- **Controller Hook (useX):** Orchestrates state, queries, mutations, and side effects for a view.
- **Service:** Business logic orchestration layer. Transforms data, validates, composes repository calls.
- **Repository/API:** Raw API call wrappers. One function per endpoint.

---

## Absolute Rules

1. **NEVER** use `any` — use `unknown`, generics, or proper types.
2. **NEVER** disable ESLint rules — no `eslint-disable`, `@ts-ignore`, or `@ts-expect-error`.
3. **NEVER** use `console.log` — only `console.warn` and `console.error` are permitted.
4. **NEVER** use `!` non-null assertion operator.
5. **NEVER** use `==` or `!=` — always use `===` and `!==`.
6. **NEVER** use `var` — prefer `const`, use `let` only when reassignment is required.
7. **NEVER** hardcode user-facing text — prepare for i18n by extracting strings to constants or translation files.
8. **NEVER** use raw HTML `<select>`, `<input>`, or `<textarea>` — use shadcn/ui components.
9. **NEVER** put `const`, `interface`, `enum`, or `type` declarations inside ANY file that isn't a dedicated type/constant/enum file — this includes hooks, components, services, and stores. Types go in `src/types/`, enums in `src/enums/`, constants in `src/constants/`.
10. **NEVER** put custom hooks inside component files — hooks go in `src/hooks/`.
11. **NEVER** put utility functions inside component files — move to `src/utilities/` or `src/lib/`.
12. **NEVER** call React hooks (`useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`, `useReducer`, `useContext`) directly in `.tsx` files — ALL hook logic must be in a controller hook extracted to `src/hooks/`. TSX files may only call ONE controller hook.
    12a. **NEVER** put inline sub-components (helper functions that return JSX) inside `.tsx` files — extract each to its own file in the same directory.
13. **NEVER** use string literal unions for domain values — use enums from `src/enums/`.
14. **NEVER** compare domain values with raw strings — use enum comparisons.
15. **NEVER** use `dangerouslySetInnerHTML`.
16. **NEVER** store secrets in `localStorage` or browser state.
17. **NEVER** inline `fetch` calls in TSX — use repository functions.
18. **TSX files = pure render composition ONLY.** No business logic.
19. All GET requests use TanStack Query `useQuery`.
20. All mutations use TanStack Query `useMutation`.
21. Query keys must be structured and reusable — use query key factories in `src/repositories/shared/query-keys.ts`.
22. All protected pages must use the auth guard.
23. Every page needs loading, empty, and error states handled.
24. No inline domain types, enums, or constants in TSX files.
25. Use `type` over `interface` unless declaration merging is needed.
26. All imports of types must use `import type { ... }` syntax.
27. Always handle API errors — never swallow errors silently.
28. Use `cn()` from `@/lib/utils` for conditional Tailwind classes.
29. No default exports except for Next.js pages/layouts.
30. No circular dependencies between modules.
31. **NEVER** render a close button inside a `Dialog` — `DialogContent` already renders one, and a second X leaves the user guessing which control owns the panel. `DialogTitle`/`DialogDescription` belong inside `DialogContent`, never as its sibling. See `rules/03-frontend-rules.md` → Dialog Rules.

---

## Library Wrapping Rule

Every third-party library MUST be wrapped in a dedicated module. Components, hooks, services, and repositories NEVER import third-party packages directly — they import the wrapper. If the library changes, only the wrapper file needs updating.

**Already wrapped:**

- `src/services/shared/api-client.ts` wraps `fetch`
- `src/lib/utils.ts` wraps `clsx` + `tailwind-merge`

**Pattern for new libraries:** Create a wrapper in `src/utilities/<name>.utility.ts` or `src/lib/<name>.ts`, then import from the wrapper everywhere.

## Hook Architecture Rules

### Single Responsibility

- Each hook MUST do ONE thing. If a hook manages form state AND validation AND submission, split it.
- Controller hooks orchestrate smaller hooks — they should not contain business logic themselves.
- Pattern: `useConnectorFormState()` for form state, NOT one giant `useConnectorPage()` with everything.

### Size Limits

- **Max 50 lines per hook** (excluding imports and type annotations).
- If a hook exceeds 50 lines, split it into smaller focused hooks.
- Each smaller hook should be < 30 lines.

### No Inline Declarations in Hooks

- **NEVER** define `type`, `interface`, `enum`, or `const` inside hook files.
- Types for hook return values go in `src/types/<domain>.types.ts`.
- Constants used by hooks go in `src/constants/<domain>.constants.ts`.

### Hook Naming

- Controller hooks: `use-<component-name>.ts` (e.g., `use-chat-page.ts`)
- State hooks: `use-<feature>-state.ts` (e.g., `use-connector-form-state.ts`)
- Shared hooks: `src/hooks/common/use-<name>.ts` (e.g., `use-toggle.ts`, `use-debounce.ts`)

### Hook Composition Pattern

```
Page → usePageController()
         ├── useFeatureA()
         ├── useFeatureB()
         └── useSharedHook()
```

## Extraction Table

| What              | Where                                      |
| ----------------- | ------------------------------------------ |
| Hooks             | `src/hooks/useX.ts`                        |
| Types             | `src/types/<domain>.types.ts`              |
| Enums             | `src/enums/<name>.enum.ts`                 |
| Constants         | `src/constants/<name>.constants.ts`        |
| Query keys        | `src/repositories/shared/query-keys.ts`    |
| Helpers / Utils   | `src/utilities/<name>.utility.ts`          |
| Schemas           | `src/lib/validation/<name>.schema.ts`      |
| Repositories      | `src/repositories/<domain>.repository.ts`  |
| Services          | `src/services/<domain>.service.ts`         |
| UI Primitives     | `src/components/ui/` (shadcn/ui generated) |
| Common Components | `src/components/common/`                   |
| Layout Components | `src/components/layout/`                   |

---

## TanStack Query Patterns

### Query Key Factories

```typescript
// src/repositories/shared/query-keys.ts
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: AgentFilters) => [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
};
```

### Rules

- `useQuery` for all reads — never raw fetch in components.
- `useMutation` for all writes — with `onSuccess` invalidation.
- Use `placeholderData: keepPreviousData` for paginated queries.
- Use `isFetching` (not `isLoading`) for DataTable loading prop.
- Prefer `invalidateQueries` over manual `refetch`.
- Wrap query/mutation hooks in controller hooks — never call `useQuery`/`useMutation` directly in TSX.

---

## Styling Rules

- Use CSS variables for theming (`--background`, `--foreground`, `--primary`, etc.).
- Use semantic Tailwind classes (`text-muted-foreground`, `bg-card`, `border-border`, etc.).
- **No** `dark:` prefixes — CSS variables handle dark mode automatically.
- **No** raw color classes (`text-blue-500`) for semantic meaning — use design tokens.
- Use `cn()` for combining conditional classes.
- Responsive design: mobile-first with `sm:`, `md:`, `lg:` breakpoints.
- **Anything that has to grow for a finger uses `touch:`, never `max-md:`.**
  `touch:` is a custom variant declared in `globals.css` matching
  `(hover: none) and (pointer: coarse)` as well as `max-width: 767px`. A width
  test alone misses a phone in landscape, which reports 915x412 and silently
  falls back to desktop sizing — the cause of most of the 2026-08-22 mobile
  regression. Use it for touch targets (44px), form-control size (16px, or iOS
  zooms the page on focus), and for switching a table to cards.
  A test asserts `max-md:` never returns.
- **Screen capture is desktop-only.** `getDisplayMedia` does not exist on any
  mobile browser, so `useScreenshotCapture` reports `isSupported` and the UI
  hides the button rather than failing on tap. Cancelling the picker is
  `NotAllowedError` — a decision, not an error, and it must stay silent.
- **`.safe-bottom` and `.safe-top` assign padding, so they beat `p-*`.** They
  live in `@layer utilities` and are declared later, so an element carrying both
  `p-5` and `safe-bottom` ends up with a bottom padding of the safe-area inset
  alone — 0px on desktop. That is how the PWA install banner got buttons flush
  against its border while every other edge had air. Pair them with a base class
  (`safe-bottom-base-5`, `safe-top-base-4`, `safe-bottom-base-nav`) so the two
  declarations cooperate.
- **Two features pinning a control to the same corner need a shared rail.**
  `FLOATING_ACTION_RAIL_SLOT_ONE`/`_TWO` in
  `constants/floating-action.constants.ts` own the mobile bottom-end stack; the
  chat FAB and the feedback launcher each take a slot. They previously computed
  the same offset independently and sat on top of each other.
- **Every grid names its base column count.** `grid gap-4 lg:grid-cols-2` and
  plain `grid gap-3` both leave the mobile track implicit, and an implicit track
  is sized to its content — which is how a 288px grid laid out a 350px card and
  scrolled `main` sideways. Write `grid grid-cols-1 ...`; `grid-flow-*`,
  `auto-cols-*` and `grid-rows-*` are the deliberate exceptions.

---

## Component Rules

- **shadcn/ui** for all form inputs (Input, Select, Textarea, Checkbox, etc.).
- **DataTable** for all tabular data display.
- **PageHeader** for consistent page headers.
- **EmptyState** for empty data states.
- **StatusBadge** for status display with color coding.
- **Skeleton** components for loading states.
- All components receive data via props — no internal data fetching.

---

## File Organization

```
src/
  app/                    # Next.js App Router pages and layouts
  components/
    ui/                   # shadcn/ui primitives (auto-generated, do not manually edit)
    common/               # Shared composed components
    layout/               # Shell layout components
    <feature>/            # Feature-specific composed components
  hooks/                  # Controller hooks and shared hooks
  services/               # Business logic orchestration
  repositories/           # API call wrappers
    shared/               # Shared query keys, API client
  types/                  # TypeScript type definitions
  enums/                  # TypeScript enum definitions
  constants/              # Application constants
  utilities/              # Helper/utility functions
  lib/                    # Framework utilities (cn, validation schemas)
    validation/           # Zod schemas
  stores/                 # Zustand stores (minimal client-only state)
```

---

## Commands

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Development server on port 3000             |
| `npm run build`        | Production build                            |
| `npm run lint`         | ESLint check                                |
| `npm run lint:strict`  | ESLint check with zero warnings             |
| `npm run lint:fix`     | ESLint auto-fix                             |
| `npm run format`       | Prettier format all source files            |
| `npm run format:check` | Check formatting without writing            |
| `npm run typecheck`    | TypeScript type checking                    |
| `npm run validate`     | Full validation (typecheck + lint + format) |
| `npm run test`         | Run unit tests                              |
| `npm run test:watch`   | Run tests in watch mode                     |
| `npm run test:cov`     | Run tests with coverage                     |
| `npm run test:e2e`     | Run Playwright end-to-end tests             |

---

## Code Quality Checklist

Before every commit, verify:

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint:strict` passes with zero warnings
- [ ] `npm run format:check` passes
- [ ] No `any` types anywhere
- [ ] No `eslint-disable` comments
- [ ] No `console.log` statements
- [ ] All new pages have loading, empty, and error states
- [ ] All new API calls go through repositories
- [ ] All new queries use TanStack Query with proper key factories
- [ ] All types extracted to `src/types/`
- [ ] All enums extracted to `src/enums/`
- [ ] All constants extracted to `src/constants/`
- [ ] TSX files contain only render composition

---

## Security Rules

1. Never store API keys, tokens, or secrets in client-side code or browser storage.
2. All sensitive configuration goes through environment variables (`NEXT_PUBLIC_` prefix for client-accessible only).
3. Validate all user input with Zod schemas before processing.
4. Sanitize any data rendered from external sources.
5. Use HTTPS for all API calls.
6. Implement proper CSRF protection for mutations.
7. Never expose internal error details to users — show user-friendly messages.
8. Auth tokens must be stored securely (httpOnly cookies preferred over localStorage).

## Workflow Phase Requirements

All frontend work MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Map all affected pages/components/hooks/types before coding
- **Phase 0g** (Business Framing): Define user states, loading/error/empty/success for every new page
- **Phase 6** (Frontend Implementation): Follow exact order: types→enums→constants→repository→hooks→components→page→i18n
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (UI testing): Manually verify all loading/empty/error/success states after implementation

## Pre-Implementation Checklist (frontend)

Before writing frontend code:

- [ ] Read root CLAUDE.md
- [ ] Read apps/claw-frontend/CLAUDE.md (this file)
- [ ] Read existing hook/component structure for the feature area
- [ ] Confirm backend API contract exists and is stable
- [ ] Confirm all i18n key names planned
- [ ] Confirm all required types are mapped from backend DTOs

## Post-Implementation Checklist (frontend)

After implementing any frontend change:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new pages have: loading state, empty state, error state, success state
- [ ] All form controls use shadcn/ui (NO raw `<select>`, `<input>`, `<textarea>`)
- [ ] All page component functions have explicit `React.ReactElement` return type
- [ ] All new text has i18n keys in ALL 13 locale files (en, ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh)
- [ ] No React hooks directly in `.tsx` files (all in controller hook)
- [ ] No inline types/enums/constants in any `.tsx` or hook file
- [ ] All poll hooks detect `meta?.['error'] === true` to stop polling
- [ ] All poll hooks detect success metadata to stop polling
- [ ] No raw string comparisons — use enum comparisons
- [ ] `import type { ... }` for all type-only imports
- [ ] All new components receive data via props (no internal fetching)

## Required Output Format

After completing any frontend implementation:

1. **Files changed** (list with purpose of each change)
2. **New routes added** (page paths)
3. **New hooks** (what each does)
4. **i18n keys added** (count per locale)
5. **Evidence**: typecheck output, lint output, test output
6. **Known gaps or follow-up items**

## Floating UI must register itself (2026-08-27)

Toasts stack from the bottom edge, and so does everything else that floats there.
The viewport used to reserve space for exactly one obstacle — the mobile bottom
nav — as a hardcoded height, so toasts landed on the feedback launcher, the chat
FAB and the PWA install prompt.

**Toasts stack from the TOP edge** (2026-08-28), below the header. This reverses
the earlier move to the bottom: the bottom is where the launcher, the chat FAB,
the install prompt, the composer and the mobile nav already live, so the column
had to dodge five things and sat somewhere different on every page.

Add `data-top-obstacle` to any band pinned across the top, and
`data-rail-obstacle` to bottom-anchored furniture the floating rail would land
on. `useFloatingObstacleClearance` measures them and writes the offset. Never
hardcode a clearance that encodes another component's height, and never assemble
a Tailwind class by interpolation — Tailwind scans source text, so a computed
class is one it never generates. Anything dynamic goes through a CSS custom
property with a static `var()` in the class string and a fallback.

**Two registries, opposite edges.** `data-top-obstacle` → `--toast-top-clearance`
for the toast column; `data-rail-obstacle` → `--rail-obstacle-clearance` for the
rail. One hook measures both; `FloatingClearanceEdge` picks the edge. The old
`data-floating-obstacle` registry existed only so a bottom-anchored toast column
could dodge the launcher, and was removed with the move rather than left as a
tag that looks meaningful and does nothing.

Two lifecycle traps, both silent: a cleanup that cancels a queued frame must
also null the handle (otherwise the scheduler believes one is pending forever
and the hook never measures again), and a box that moves without resizing fires
no observer at all — hence the bounded settle pass.

Full rule: `rules/36-floating-ui-and-toast-clearance.md`.

## Editorial marketing classes are hand-written, not Tailwind (2026-08-27)

The `/compare/*` and `/coding-agent*` pages are styled by a BEM vocabulary in
`globals.css`, not by utilities. A class name that never made it into the
stylesheet is therefore **invisible**: the markup renders, typecheck and build
pass, and the section is simply unstyled. The coding-agent pages shipped with
six such names — the install buttons rendered as one cream slab and every list
item ran its title into its body with no separator.

`components/marketing/__tests__/editorial-class-vocabulary.test.ts` now fails on
any `editorial-*` class used in TSX but absent from `globals.css`. Before adding
a class, check whether the vocabulary already has one: `__cta` is the panel,
`__cta-primary`/`__cta-secondary` are the buttons inside it.

Illustrations of another product's interface are drawn (`editorial-figure`),
never screenshotted — a VS Code screenshot is wrong the moment the reader's
theme, version or language differs, and a picture that disagrees with the screen
is worse than none. Literal UI words quoted inside a figure ("Extensions",
"Install") stay untranslated on purpose; the accessible name comes from the
translated step title on the `<figure>`.

## Local Frontier (llama.cpp) page

Route: `/models/local-frontier`. Sidebar nav entry: `nav.modelLocalFrontier`. Page composition:

- Controller hook: `useLocalFrontierCatalogPage` (`src/hooks/local-frontier/use-local-frontier-catalog-page.ts`) — composes 14 sub-hooks (catalog, hardware, runtime info, loaded model, pull jobs, initiate/cancel/retry pull, refresh catalog/hardware, load/unload/delete model, update runtime config, SSE progress).
- Components: `HardwarePanel`, `FilterBar`, `DownloadsDrawer` (with live SSE progress via `usePullProgressSse`), 3 dialogs (`DeleteWeightsDialog`, `OverridePromptDialog`, `RuntimeConfigDialog`).
- Chat ModelSelector (`useAvailableModels`) shows `local-llamacpp` group with READY frontier models, sorted right after `local-ollama` group.
- All ~80 new strings added to all 13 locales (`en/ar/de/es/fa/fr/hi/it/ja/pt/ru/th/zh`).

## A run that starts without announcing itself is invisible (2026-08-28)

Reported as "sometimes the answer doesn't show until I refresh". Reproduced and
fixed; the reproduction is in `use-thread-detail.test.tsx` and it fails against
the old code.

`useThreadDetail` only opens the SSE subscription and starts polling while
`isWaitingForResponse` is true. **Every flow that starts a run must call
`startWaitingForResponse()`.** Sending and regenerating did. Editing a prompt —
which re-runs the thread from that message — did not, so the reply was streamed
to nobody and written to a database nothing was reading. It appeared on the next
remount, which is exactly what a refresh is.

There is a recovery effect for precisely this case: a transcript ending in a
`USER` message with no answer re-arms the waiting state. It could not fire,
because it was gated on a `waitingSuppressedRef` **boolean** that the previous
run had set and nothing ever cleared. The suppression exists for a real reason —
between `DONE` arriving and the refetch landing, the transcript still ends with
the user's message, and re-arming there loops the spinner — but a boolean makes
it permanent for the life of the thread.

It is now keyed on `buildTranscriptSignature(count, lastMessageId)`: the
conclusion is scoped to the transcript it concluded. The **count** is the
load-bearing half — editing a prompt deletes every answer below it, so the
count is what changes when a rewritten question replaces an answered one whose
id it keeps.

Two rules follow:

- **Never re-introduce a plain boolean here.** Any conclusion about a run must
  name the transcript it applies to.
- **A new run-starting flow gets `onRerunStarted` plumbed to it**, the way
  `onRegenerate` already travels: controller → `use-virtualized-messages-controller`
  → `VirtualizedMessageItem` → `MessageBubble` → the action.

The signature alone cannot rescue every case: editing the sole user turn of a
two-message thread returns the transcript to the same count and id it had when
the run was concluded. That case is covered only by the explicit callback, which
is why both exist.

## A blocked connect-src fails silently (2026-08-28)

`ep1/ep2.adtrafficquality.google` — AdSense's invalid-traffic beacon — was
blocked by our own CSP on the live site while ads rendered normally. Nothing
looks broken from the page: ads still appear, and only the browser console says
anything. What is lost is the signal Google uses to separate real traffic from
fraudulent traffic, which protects the ad account.

It reports over **four** directives — `img-src` (a `/pagead/sodar?...` pixel),
`script-src` (`sodar2.js`), `connect-src` (a fetch) and `frame-src` (an
invisible iframe). Each was found only after the previous one was unblocked,
because the browser reports whichever the beacon reaches first: fixing two of
them and reloading looks like a fix and is not. **Adding a Google ad host to one
directive is rarely finished** — check the console again after every round.

`script-src` matters in development only. Production has `strict-dynamic`, under
which the nonce-trusted AdSense loader vouches for what it inserts; development
has no such help, so without the host the console fills with blocked-script
errors that read like a broken ad integration.

Like every other ad host it is added only when AdSense is actually enabled, so
an install serving no ads does not widen its policy.

Check the browser console against the real site after any CSP change.
`script-src` is exempt from this class of bug in production only because
`strict-dynamic` lets the nonce-trusted loader vouch for what it inserts —
`connect-src`, `img-src` and `frame-src` get no such help.

## `beforeInteractive` breaks hydration in the head (2026-08-28)

`next/script` with `strategy="beforeInteractive"` emits an inline
`(self.__next_s=...).push(...)` element on the **server** and renders **nothing**
on the client. The server `<head>` therefore carries one more child than the
client's, and React aligns every following sibling against the wrong node.

It surfaced as the GTM bootstrap being reconciled against the AdSense loader —
a hydration error naming a `pagead2.googlesyndication.com` `src` that the
analytics component does not contain, which sends you looking in the wrong file.

Every tag in `AnalyticsHead` is `afterInteractive`, which is what Next's and
Google's own GTM integration uses. A test asserts the strategy so it cannot be
quietly raised back for "earlier measurement".

The general rule for this `<head>`: a component rendered there must produce the
**same number of children** on the server and the client. `AnalyticsHead` and
`AdSenseHead` both return `null` when unconfigured, which is safe — the count
matches on both sides. A strategy that renders on only one side is not.

## Model prices: `/admin/smart-router/model-costs`

The operator surface for `ModelCostVersion`. Linked from the Smart Router admin
page header and from the admin sidebar (`nav.adminModelCosts`); gated on
`Permission.ADMIN_MODELS_MANAGE` — the permission the BACKEND enforces, not the
parent page's `ADMIN_ROUTING_MANAGE`, or a routing manager would reach a page
that 403s on every call.

- Controller hook `useModelCostsPage` composes `useModelCostCatalog`,
  `useModelCostFilters`, `useModelCostEditDialog` and `usePublishModelCost`.
  Counts come from the WHOLE catalogue, never the filtered rows: filtering to
  PUBLISHED must not report that zero models are on a fallback.
- **Money is integer micro-USD per million tokens, end to end.** It is formatted
  only at render, in `utilities/model-cost.utility.ts`, by moving the decimal
  point through STRING slicing. `value / 1_000_000` plus `toFixed` is banned
  here: `0.07 * 1e6` is `70000.00000000001`, and a rate that renders as $2.50
  while the wallet charges 2_499_999 is a lie the operator cannot see. Round
  trips are unit-tested.
- A missing rate renders as "No rate", never `$0.00` — an unpriced model is
  refused, not free.
- The edit dialog's form is seeded ONCE from the row, so `ModelCostEditForm` is
  mounted with `key={provider:modelKey}`. Without that key, reopening on a
  different model publishes the previous model's rates under the new key.
- Publishing mints a new immutable version and pins the model as an admin
  override; the help text says so, because automated sync will then never
  refresh it.

## AdSense script vs verification vs ad units (2026-09-01)

An AdSense "low value content" rejection traced back to `AdSenseHead` being
mounted in the ROOT layout (`app/layout.tsx`), with no pathname check —
`(auth)`, `(portal)`, and `(payment)` all render through the root layout, so
the ad loader script executed on login, chat, billing and settings. A
pathname-aware hook (`useAdSenseScript` / `shouldLoadAdSenseScript`) already
existed but was never wired into anything actually mounted — dead code
guarding nothing. Comments across the codebase claimed "the script only ever
lives in the marketing layout," which was aspirational, not true.

Fixed by splitting into three independently-gated pieces (see
`docs/03-architecture/adsense-eligibility.md` and
`rules/38-adsense-eligibility-and-low-value-content.md`):

- **Verification** (`<meta name="google-adsense-account">`) stays in
  `AdSenseHead`, now mounted only in `(marketing)/layout.tsx`.
- **The loader script** moved to `AdSenseScriptLoader`, a client component
  that re-derives pathname eligibility via the (previously-dead)
  `useAdSenseScript` hook. `reviewMode` no longer bypasses eligibility — a
  page the reviewer should never see monetized on must not carry the loader
  either, verification or not.
- **Manual ad units** (`AdUnit`) were already correctly gated; unchanged.

`app/__tests__/adsense-route-boundary.test.ts` asserts the route boundary
structurally (reads each layout's source, fails if AdSense is referenced
outside `(marketing)`) — a regression here fails on exactly the bug that
caused the rejection, not on a behavioral edge case a future refactor might
miss.

**A raw `<script src>` rendered from a client component is hoisted to the
real `document.head` by React regardless of where in the tree it renders**,
and is NOT removed on unmount. This broke a first draft of
`adsense-script-loader.test.tsx`: `@testing-library/react`'s `render()`
mounts into real jsdom, so a script asserted-absent in one test could still
be the leftover DOM node from an earlier test in the same file (jsdom is not
reset between `it()` blocks). Use `renderToStaticMarkup` for this component's
tests instead — it never touches the real document.

Public chat shares also got a **temporary, blanket kill switch**
(`CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED`,
`constants/chat-share-review-lockdown.constants.ts`) that overrides the
existing per-snapshot `adsEligible`/`indexEligible` system to `false`/excluded
everywhere (ads, indexing, sitemap, RSS) for the AdSense review window —
`/rss.xml` in particular is served by a SEPARATE implementation
(`global-rss.service.ts`) from the per-locale feeds (`rss.service.ts`); both
needed the same guard, and missing the second one was caught only by running
the full test suite, not by reasoning about the call graph.
