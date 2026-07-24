---
name: create-view-model-hook
summary: Author a controller/view-model hook that orchestrates smaller query/mutation/state hooks, stays under 50 lines, has one responsibility, and returns an explicitly typed object.
task_keywords:
  [
    controller hook,
    view model hook,
    orchestration hook,
    use page hook,
    compose hooks,
    hook single responsibility,
  ]
applies_to: [claw-frontend]
required_rules: [03-frontend-rules, 04-testing-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest]
required_docs: [docs/05-frontend]
validation_lane: cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a View-Model (Controller) Hook

The controller hook is the page's single entry point. It composes smaller hooks (queries,
mutations, local state) and exposes a flat, typed result. It orchestrates — it does not
contain business logic or JSX.

## When to use

- A page/container needs data + handlers wired together behind one `use<Domain>Page()` call.

## When NOT to use

- A single query → `./create-query.md`. A single mutation → `./create-mutation.md`.
- Pure rendering → `./create-presentational-component.md`.

## Read first

- `./resolve-task-context.md` — resolve the task pack.
- `../rules/03-frontend-rules.md` — Hook Rules (§ single responsibility, max 50 lines, explicit return type in `src/types/hook.types.ts`).

## Repository discovery steps

1. `Grep` `src/hooks/**/use-*-page.ts` for an existing controller hook to model after.
2. Identify the smaller hooks to compose (query hook, mutation hook, local state) — build any missing ones first.
3. Confirm the return type will live in `src/types/hook.types.ts`.

## Tests-first plan

- Vitest with a `QueryClientProvider` wrapper: mock child hooks/repository, assert loading/empty/error/success flags and that handlers call the right mutation.
- Assert per-row `pendingId` is surfaced, not a global `isMutating`.

## Implementation steps

1. Create `src/hooks/<domain>/use-<domain>-page.ts`.
2. Call the smaller hooks: query hook(s) for data, mutation hook(s) for writes, `useState`/Zustand for local UI state.
3. Derive display state (empty, counts, selected item) rather than duplicating it in extra state.
4. Wrap event handlers (`handleCreate`, `handleDelete`) that call mutations — no inline business logic in the returned object.
5. Keep the hook ≤50 lines (excluding imports/types); if larger, split into more single-responsibility hooks and compose.
6. Return one flat object typed by an extracted type in `src/types/hook.types.ts` — no inline `type`/`enum`/`const` in the hook file.

## Security considerations

- Do not read or persist tokens here; auth is handled by `apiClient` and the auth store.

## Failure modes

- Hook grows past 50 lines or gains multiple responsibilities → split.
- Business logic (data transforms, validation) inside the hook → move to `src/utilities/` and import.
- Inline return type → extract to `src/types/hook.types.ts`.

## Validation commands

`cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build`. Never `--no-verify`.

## Documentation updates

- Note the controller hook in the domain's `docs/05-frontend/*` doc if it establishes a new pattern.

## Definition of done

- ≤50 lines, one responsibility, composes smaller hooks, explicit extracted return type, per-row pending surfaced, validation lane green.
