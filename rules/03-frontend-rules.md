# ClawAI — Frontend Architecture Rules

> Applies to `apps/claw-frontend`. React 19, Next.js 16, TanStack Query, Zustand, Tailwind, shadcn/ui.

## Architecture Pattern

```
Page (.tsx)
  └── ONE controller hook (useXPage)
        ├── Data hooks (useQuery wrappers)
        ├── Mutation hooks (useMutation wrappers)
        ├── State hooks (form state, toggle state)
        └── Event handlers (callbacks)
```

**Pages are pure render composition.** They call ONE controller hook and pass results to components. Zero business logic in pages.

## Page Rules

```
1. ONE controller hook call per page — no direct useState/useEffect/useQuery
2. Pure render composition — no business logic
3. Must handle ALL states: loading, empty, error, success
4. No inline styles — use Tailwind via cn()
5. Must export as: export default function PageName(): React.ReactElement
6. No inline types, enums, or constants — extract to src/types/, src/enums/, src/constants/
7. No inline sub-components — extract each to its own .tsx file
```

## Hook Rules

```
1. Single responsibility — each hook does ONE thing
2. Max 50 lines per hook (excluding imports and types)
3. If over 50 lines → split into smaller hooks
4. Controller hooks orchestrate smaller hooks, not logic
5. ALL GET requests via useQuery with query key factory
6. ALL mutations via useMutation with onSuccess invalidation
7. NEVER call useQuery/useMutation directly in .tsx files — wrap in custom hooks
8. Hooks live in src/hooks/<domain>/use-<name>.ts
9. NO type, interface, enum, or const inside hook files
10. Return type must be explicitly typed (in src/types/hook.types.ts)
```

## Component Rules

```
1. Each component does ONE thing — if doing two, split it
2. Props-only data flow — components NEVER fetch data internally
3. shadcn/ui for ALL form inputs (Input, Select, Textarea, Checkbox, etc.)
4. NO raw HTML <select>, <input>, <textarea>
5. NO dangerouslySetInnerHTML
6. Every component that needs logic gets its own hook
7. No inline logic in JSX — extract to handler functions in controller hook
```

## Dialog Rules

`DialogContent` (`components/ui/dialog.tsx`) already renders the close button,
positioned against the panel's own top-inline-end corner.

```
1. NEVER add a close button inside a Dialog — DialogContent owns the only one
2. DialogTitle and DialogDescription go INSIDE DialogContent, never beside it
3. A dialog panel keeps its surface: no bg-transparent + border-0 + shadow-none
4. Header, scroll area and footer: pin the first and last, scroll only the middle
5. A nested dialog (a lightbox over a detail dialog) is still a framed panel
```

Rules 1 and 3 travel together. The admin feedback attachment viewer set the
panel transparent and full-width and then drew its own X on top of the built-in
one: two close glyphs floated over the backdrop with no frame under them and no
way to tell which belonged to what. A dialog that needs a different close
treatment restyles `DialogContent`, it does not add a second control.

Rule 2 is not cosmetic — a `DialogTitle` placed as a sibling of `DialogContent`
renders outside the portal, leaks into the page body, and still leaves Radix
warning that the dialog has no accessible name.

## No Inline Rule (Critical)

**NEVER** define inside `.tsx` files, hook files, service files, or store files:

- `type` or `interface` → extract to `src/types/<domain>.types.ts`
- `enum` → extract to `src/enums/<name>.enum.ts`
- `const` (screaming-case) → extract to `src/constants/<name>.constants.ts`
- Utility functions → extract to `src/utilities/<name>.utility.ts`
- Sub-components (JSX functions) → extract to their own `.tsx` files

## State Management Rules

```
TanStack Query  → ALL server state (API data, mutations)
Zustand         → MINIMAL client-only state (auth, sidebar, log filters)
useState/useRef → Component-level local state only
```

- No prop drilling beyond 2 levels — use context or composition
- No redundant state — if it can be derived, derive it
- No direct API calls in components — go through repository → hook

## i18n Rules

```
1.  ALL user-facing text uses t('key') from useTranslation()
2.  NEVER hardcode text strings in components or pages
3.  Add new keys to ALL 13 locale files:
    - src/lib/i18n/locales/en.ts
    - src/lib/i18n/locales/ar.ts (RTL)
    - src/lib/i18n/locales/de.ts
    - src/lib/i18n/locales/es.ts
    - src/lib/i18n/locales/fr.ts
    - src/lib/i18n/locales/hi.ts
    - src/lib/i18n/locales/it.ts
    - src/lib/i18n/locales/pt.ts
    - src/lib/i18n/locales/ru.ts
4.  Type-safe keys defined in src/types/i18n.types.ts
5.  Arabic RTL support — no hardcoded LTR layout assumptions

ABSOLUTE RULE — i18n.types.ts TRAVELS WITH LOCALES
==================================================
6a. src/types/i18n.types.ts MUST be updated and committed in the
    SAME commit as any change to src/lib/i18n/locales/*.ts.
    The TranslationDictionary type IS the schema every locale
    conforms to. If you add a key to a locale without updating the
    type, typecheck fails everywhere. Never push locale changes
    without the matching type change — they are one atomic unit.

ABSOLUTE RULE — NEVER LEAK ENGLISH INTO NON-EN LOCALES
======================================================
6.  When you add a new key, you MUST write a real, native translation
    in every non-EN locale. Copying the English string into ar.ts /
    de.ts / etc. as a "stub" or "placeholder" is FORBIDDEN.
7.  This rule is for AI assistants and humans alike. The user reads
    de.ts expecting German; copying English ships an English UI to
    a German user.
8.  If you genuinely don't know the translation for a string in a
    target language, look it up. "I don't know what 'Filter' is in
    Italian" → look it up (Filtro), don't copy 'Filter'.
9.  Loanwords (Confluence, GitHub, Story Points), unit acronyms (GB,
    ms), and placeholder-only strings ({ms}ms) MAY remain identical
    across languages — but only when you KNOW the target language
    accepts the loanword.
10. Run `node tools/audit-untranslated-i18n.cjs` before committing
    new i18n keys. The audit lists every non-EN entry whose value
    matches the EN value (minus the exempt set). Every flagged
    entry must be either a real translation or a documented loanword.
11. Manual smoke test before declaring done: switch the UI language
    to `de` or `ar` and confirm the new strings render in the right
    language. A 3-second language toggle catches every English-leak
    this rule is designed to prevent.
```

## Styling Rules

```
1. CSS variables for theming (--background, --foreground, --primary)
2. Semantic Tailwind classes (text-muted-foreground, bg-card, border-border)
3. NO dark: prefixes — CSS variables handle dark mode automatically
4. NO raw color classes (text-blue-500) for semantic meaning
5. Use cn() from @/lib/utils for conditional classes
6. Mobile-first: sm:, md:, lg: breakpoints
7. Touch sizing uses the `touch:` variant, NEVER `max-md:`. `touch:` matches
   (hover: none) and (pointer: coarse) as well as max-width 767px; a width test
   alone misses a phone in landscape, which reports 915x412 and falls back to
   desktop sizing. Applies to 44px targets, 16px form controls, and card/table
   switching.
8. Every grid names a base column count (`grid grid-cols-1 ...`). An implicit
   track is sized to its content and will overflow a narrow viewport.
   `grid-flow-*`, `auto-cols-*` and `grid-rows-*` are the exceptions.
```

## Extraction Table

| What                 | Where                                              |
| -------------------- | -------------------------------------------------- |
| Types                | `src/types/<domain>.types.ts`                      |
| Component prop types | `src/types/component.types.ts`                     |
| Hook return types    | `src/types/hook.types.ts`                          |
| Enums                | `src/enums/<name>.enum.ts`                         |
| Constants            | `src/constants/<name>.constants.ts`                |
| Hooks                | `src/hooks/<domain>/use-<name>.ts`                 |
| Utilities            | `src/utilities/<name>.utility.ts`                  |
| Repositories         | `src/repositories/<domain>/<domain>.repository.ts` |
| Query keys           | `src/repositories/shared/query-keys.ts`            |
| Zod schemas          | `src/lib/validation/<name>.schema.ts`              |
| Stores               | `src/stores/<name>.store.ts`                       |

## Library Wrapping Rule

Every third-party package must be wrapped before use in components/hooks:

```
src/utilities/<library>.utility.ts  (for utilities/helpers)
src/lib/<library>.ts                (for framework utilities)
```

Never import npm packages directly in .tsx or hook files.

## ESLint Additions (Frontend)

```
react/jsx-no-target-blank         → ERROR
react/no-danger                   → ERROR
react/no-unstable-nested-components → ERROR
react-hooks/rules-of-hooks        → ERROR
react-hooks/exhaustive-deps       → WARN
jsx-a11y/alt-text                 → ERROR
jsx-a11y/anchor-is-valid          → ERROR
```

## API Communication Pattern

```
Repository    →  raw fetch call (one function per endpoint)
Hook          →  useQuery/useMutation wrapping the repository function
Component     →  uses data from hook via controller hook
```

Repository format:

```typescript
// src/repositories/chat/chat.repository.ts
export const sendMessage = async (dto: SendMessageDto): Promise<ChatMessage> => {
  return apiClient.post('/chat-messages', dto);
};
```

## Common Mistakes to Avoid

1. Calling `useState` directly in a `.tsx` file — put it in a hook
2. Calling `useQuery` directly in a `.tsx` file — wrap in a custom hook
3. Defining a `type` inline in a hook file — extract to `src/types/`
4. Using `<input>` instead of shadcn `<Input>` — always use shadcn
5. Hardcoding text strings — always use `t('key')`
6. Not handling the error state in a page — all 4 states required
7. Forgetting to invalidate query cache on mutation success
8. Using `dark:` Tailwind classes — CSS variables handle dark mode
9. Adding more than one controller hook call to a page
10. Defining a sub-component function inside a page file — extract to its own file
11. Comparing strings against domain values — use enum comparisons
12. Passing more than 2 levels of props — use context or composition
13. Adding a close button to a Dialog — DialogContent already renders one
14. Truncating a value the reader needs in full (URL, user agent) — wrap it

## Enforcement

- **ESLint** — `npm run lint:frontend`, including the TSX restrictions that
  keep hooks, types and constants out of component files.
- **Unit test** — Vitest, via `npm run affected:test`.
- **CI job** — the frontend lane of the CI matrix, plus Lighthouse budgets
  (`.github/workflows/lighthouse.yml`) for the public surfaces.

## Definition of done

- [ ] TSX files contain render composition and one controller hook only.
- [ ] Types, enums, constants and hooks live in their own files.
- [ ] Frontend lint and tests pass.
