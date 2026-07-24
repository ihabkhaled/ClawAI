---
name: create-client-container
summary: Wire a client container — one controller hook plus a thin client component that orchestrates smaller hooks and passes props down, with zero business logic in the tsx.
task_keywords:
  [
    client container,
    controller hook wiring,
    orchestration component,
    smart component,
    container component,
    thin component,
  ]
applies_to: [claw-frontend]
required_rules: [03-frontend-rules, 04-testing-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest]
required_docs: [docs/05-frontend]
validation_lane: cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Client Container

A container is the seam between the page and the presentational tree: it calls the ONE
controller hook and hands data + handlers to props-only components. It contains no business
logic itself — orchestration lives in the controller hook, rendering lives in components.

## When to use

- A page/section needs interactivity (`'use client'`) and must connect a controller hook to a presentational subtree.
- You want to keep `page.tsx` a pure server-composition shell and push client state into a container.

## When NOT to use

- The logic itself → `./create-view-model-hook.md`.
- Pure rendering with no hooks → `./create-presentational-component.md`.

## Read first

- `./resolve-task-context.md` — resolve the task pack.
- `../rules/03-frontend-rules.md` — Component Rules + No Inline Rule.

## Repository discovery steps

1. `Grep` for existing containers in `src/components/<domain>/` that pair with a `use<Domain>Page` hook.
2. Confirm the controller hook's return type is declared in `src/types/hook.types.ts`.
3. Check prop types belong in `src/types/component.types.ts`.

## Tests-first plan

- Vitest: mock the controller hook, assert the container forwards data/handlers and renders the right state child.
- Assert per-row pending state is threaded down (not a single global disable).

## Implementation steps

1. Create `src/components/<domain>/<name>-container.tsx` with `'use client'` at the top.
2. Call exactly ONE controller hook (`./create-view-model-hook.md`); do not call `useQuery`/`useMutation`/`useState` here beyond the controller hook.
3. Branch on the hook's `isLoading`/`isError`/empty/success flags and render dedicated presentational components — no inline sub-components.
4. Pass data and event handlers as props only; components never fetch.
5. Extract prop types to `src/types/component.types.ts`; no inline `type`/`enum`/`const`.
6. Style via semantic Tailwind + `cn()`; no `dark:` prefixes.

## Security considerations

- Do not read tokens/secrets in the container; rely on `apiClient` interceptors handled in the repository layer.

## Failure modes

- Business logic creeping into the container → move it to the controller hook.
- Multiple hook calls → collapse into the single controller hook.
- Inline prop type or sub-component → extract.

## Validation commands

`cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build`. Never `--no-verify`.

## Documentation updates

- Note the container in the domain's `docs/05-frontend/*` doc if it introduces a new interaction pattern.

## Definition of done

- Container calls one controller hook; forwards props only; all states handled; no inline declarations; validation lane green.
