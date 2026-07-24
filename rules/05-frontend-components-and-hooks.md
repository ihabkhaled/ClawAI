# 05 — Frontend Components and Hooks

## Purpose

Components render; hooks hold logic. Splitting them — and keeping each small and
single-purpose — is what makes the frontend reviewable and testable. This rule
covers the component/hook layer between the page and the repository.

## Applies to

`apps/claw-frontend/src/components/**`, `apps/claw-frontend/src/hooks/**`.

## Mandatory rules

1. **Components do one thing** and receive data via props — they never fetch.
2. **Every piece of logic lives in a hook** under `src/hooks/<domain>/use-<name>.ts`.
   Hooks are single-responsibility and **≤ 50 lines** (excluding imports/types).
   Controller hooks orchestrate smaller hooks; they hold no business logic themselves.
3. **shadcn/ui for all form controls** — `Input`, `Select`, `Textarea`,
   `Checkbox`, etc. Never raw HTML `<select>/<input>/<textarea>`.
4. **No inline declarations in `.tsx` or hook files.** Types → `src/types/`,
   enums → `src/enums/`, constants → `src/constants/`, utilities → `src/utilities/`.
5. **No inline sub-components** (helper JSX functions) in a `.tsx` file — extract
   each to its own file. `src/components/ui/**` (generated shadcn) is exempt.
6. **Mutations surface errors.** Every `useMutation` has `onError` that calls the
   toast helper and records a dismissable error; per-row state uses a `pendingId`,
   never a single page-wide `isMutating`.
7. **FE type field names mirror BE DTO/Prisma names verbatim** — rename only in UI
   strings, never in the type.

## Prohibited patterns

- A component calling `useQuery`/`useMutation` directly (wrap in a hook).
- A `useX()` hook defined inside a component file.
- `text-blue-500` for semantic color, or `dark:` prefixes (use CSS variables).
- Silent mutation failure (no `onError`, no user-visible path).

## Correct pattern

```
src/components/chat/MessageComposer.tsx     # render only, props-driven
src/hooks/chat/use-send-message.ts          # one mutation, onError → toast + banner
src/hooks/chat/use-thread-detail.ts         # one query
src/types/chat.types.ts                     # extracted types
```

## Enforcement

- **ESLint** (frontend) — bans inline hooks/types/consts/sub-components in `.tsx`,
  raw form elements, `dark:` prefixes, hook length; `exhaustive-deps` warns.
- **TS config** — field-name mismatches with BE types surface at typecheck when
  the shared/generated type is imported.
- **Unit test** (Vitest) — hook behavior and component render states.

## Related skills

- [03-feature-scaffold](../skills/03-feature-scaffold.md)

## Related context

- Root `CLAUDE.md` — "Component Rules", "Hook Rules", "Key Chat Components".

## Definition of done

- [ ] Logic in hooks, render in components; no inline declarations in `.tsx`.
- [ ] shadcn/ui used for every form control.
- [ ] Each mutation has `onError` + per-row `pendingId` state.
- [ ] FE type field names match BE verbatim.
