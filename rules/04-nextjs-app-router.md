# 04 — Next.js App Router

## Purpose

`apps/claw-frontend` is a Next.js 16 App Router application (React 19.2). Pages
are render composition only; all data, logic, and state live below them. This
keeps routes thin, testable, and free of the "giant page component" anti-pattern.

## Applies to

`apps/claw-frontend/src/app/**` — pages, layouts, route handlers.

## Mandatory rules

1. **Pages are pure render composition.** A `page.tsx` calls exactly **one**
   controller hook and renders. No `useQuery`/`useMutation`, no `fetch`, no
   business logic, no inline sub-components.
2. **Every page handles all states:** loading, empty, error, and success — each
   observable and testable.
3. **Explicit return type.** Page/layout functions declare `: React.ReactElement`
   (or the correct Next type). No implicit returns.
4. **Server state comes from hooks, not the page.** Data is fetched by the
   controller hook via TanStack Query (see [06](06-frontend-queries-and-cache.md)).
5. **All visible text via `t()`** and present in all 13 locales (see [20](20-i18n-and-user-facing-messages.md)).
6. **Navigation entries are extracted** — new routes register in
   `src/constants/routes.constants.ts` and `src/constants/sidebar.constants.ts`,
   not inline in a component.

## Prohibited patterns

- Calling a React hook (`useState`, `useQuery`, …) directly inside `page.tsx`
  other than the single controller hook.
- Default exports other than the Next.js page/layout itself.
- Hardcoded strings, raw `<select>/<input>/<textarea>`, or `dangerouslySetInnerHTML`.

## Correct pattern

```tsx
// apps/claw-frontend/src/app/(portal)/routing/replay/page.tsx
export default function RoutingReplayPage(): React.ReactElement {
  const { data, isLoading, error, runReplay } = useRoutingReplay(); // one controller hook
  if (isLoading) return <ReplayLoading />;
  if (error) return <ReplayError error={error} />;
  if (!data?.cases.length) return <ReplayEmpty onRun={runReplay} />;
  return <ReplayResults data={data} onRun={runReplay} />;
}
```

## Enforcement

- **ESLint** (frontend flat config) — restricts hooks/types/consts inside `.tsx`,
  bans raw form elements and `dangerouslySetInnerHTML`, requires explicit return types.
- **TS config** — `npm run typecheck` (tsgo) enforces the return type.
- **Unit test** (Vitest) — loading/empty/error/success states asserted.

## Related skills

- [03-feature-scaffold](../skills/03-feature-scaffold.md)

## Related context

- Root `CLAUDE.md` — "Frontend Architecture Rules", "Page Rules".
- `.ai/manifests/frontend-routes.json`.

## Definition of done

- [ ] Page calls one controller hook and renders only.
- [ ] Loading/empty/error/success states present and tested.
- [ ] Explicit return type; no raw form elements; all text via `t()`.
- [ ] Route registered in routes + sidebar constants.
