---
name: frontend-architecture-review
summary: Review a claw-frontend change against page-render-only, controller-hook, hook-size, shadcn/ui, extraction, i18n, mutation-error-surfacing, and FE↔BE field-parity rules.
task_keywords:
  [
    frontend review,
    page.tsx,
    controller hook,
    hook size,
    shadcn,
    extraction,
    i18n locales,
    mutation onError,
    field parity,
    pendingId,
    tanstack query,
    zustand,
  ]
applies_to: [apps/claw-frontend]
required_rules: [03-frontend-rules, 04-testing-rules, 06-docs-rules]
required_context: [codebase-navigation, CODE_REVIEW_AND_PR_REVIEW_STANDARD]
affected_workspaces: [apps/claw-frontend]
required_tests: [review-only]
required_docs: [docs/05-frontend, CLAUDE.md]
validation_lane: cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build
---

**When to use**

- Reviewing changes under `apps/claw-frontend/src/` (pages, hooks, components, repositories, stores, locales).

**When NOT to use**

- Backend DTO/endpoint changes → use `./backend-architecture-review.md`.
- New event contracts → use `./event-contract-review.md`.

**Read first**

- `./resolve-task-context.md` — run the context resolver.
- `rules/03-frontend-rules.md` (page/hook/component/i18n rules, extraction table).

**Repository discovery steps**

1. `git diff --name-only -- apps/claw-frontend/src` to list touched files.
2. Classify each: `page.tsx`, `use-*.ts` hook, component `.tsx`, `repositories/`, `stores/`, `locales/*.ts`.
3. For each `page.tsx`, confirm it wires exactly ONE controller hook.

**Tests-first plan**

- Confirm Vitest tests exist for new hooks, utilities, and components (`.test.ts`/`.spec.ts`).
- Confirm loading/empty/error/success render paths are exercised.

**Implementation steps (review checklist)**

1. **Page**: render-only, ONE controller hook, no direct `useState`/`useEffect`/`useQuery`/`useMutation`, handles loading + empty + error + success, `export default function X(): React.ReactElement`.
2. **Hook**: ≤50 lines, single responsibility, GET via `useQuery` with query-key factory, mutations via `useMutation` with `onSuccess` invalidation; lives in `src/hooks/<domain>/use-<name>.ts`.
3. **Component**: shadcn/ui for ALL form inputs — NO raw `<select>`/`<input>`/`<textarea>`; NO `dangerouslySetInnerHTML`; props-only data flow.
4. **Extraction**: no inline `type`/`interface`/`enum`/screaming-`const`/utility-fn/sub-component in `.tsx`/hook/store files — extracted per the extraction table.
5. **Mutation surfacing**: every `useMutation` has `onError` calling `showToast.apiError(err, t('…'))` plus a user-visible banner; per-row state via `pendingId: string | null` (not a single `isMutating` bool).
6. **i18n**: all user-facing text via `t('key')`; keys added to ALL 9 locales (en, ar, de, es, fr, hi, it, pt, ru) with NATIVE translations (no English leaked into non-EN); `src/types/i18n.types.ts` updated in the SAME change (atomic).
7. **FE↔BE parity**: FE type field names mirror BE DTO/Prisma verbatim (e.g. `createdAt`, not a renamed `receivedAt`); filter types are the exact `.strict()` intersection, no superset dead fields.
8. **Styling**: semantic Tailwind + CSS variables, no `dark:` prefixes, no raw color classes, `cn()` for conditionals.

**Security considerations**

- No secrets in client bundle or logs; only `console.warn`/`console.error` allowed.
- Never render untrusted HTML (`no-danger`).

**Failure modes**

- Raw HTML input bypassing shadcn/ui.
- English copied into `de.ts`/`ar.ts` as placeholder (ships wrong language).
- Locale added without `i18n.types.ts` → typecheck breaks for everyone.
- Silent mutation failure (missing `onError`).

**Validation commands**

- `rg -n "<input|<select|<textarea|dangerouslySetInnerHTML" apps/claw-frontend/src` — none outside `components/ui/`.
- `node tools/audit-untranslated-i18n.cjs` — flags non-EN entries equal to EN.
- Gate lane: `cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build`.

**Documentation updates**

- Update `docs/05-frontend/*` and `CLAUDE.md` if a page/route/component pattern changed.

**Definition of done**

- All checklist items pass, 9 locales native + `i18n.types.ts` atomic, gate lane green.
