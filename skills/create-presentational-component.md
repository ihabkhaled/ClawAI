---
name: create-presentational-component
summary: Build a props-only presentational component using shadcn/ui with no data fetching, no inline sub-components, cn() styling, and CSS-variable theming.
task_keywords:
  [
    presentational component,
    dumb component,
    props only,
    shadcn ui,
    render component,
    ui component,
    tailwind cn,
  ]
applies_to: [claw-frontend]
required_rules: [03-frontend-rules, 04-testing-rules, 08-security-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest, accessibility]
required_docs: [docs/05-frontend]
validation_lane: cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Presentational Component

A presentational component only renders from props. It never fetches, never owns server
state, and never defines inline sub-components. All form controls come from shadcn/ui.

## When to use

- Adding a card, row, badge, list item, form field, or any pure-render piece driven by props.

## When NOT to use

- The component needs data/logic → put that in a hook (`./create-view-model-hook.md`) and wire via `./create-client-container.md`.
- A modal/dialog with focus + aria concerns → `./add-accessible-dialog.md`.

## Read first

- `./resolve-task-context.md` — resolve the task pack.
- `../rules/03-frontend-rules.md` — Component Rules, Styling Rules, No Inline Rule.

## Repository discovery steps

1. `Glob` `src/components/ui/*` to confirm which shadcn primitives already exist (Input, Select, Textarea, Checkbox, Button, Card…). Never edit `src/components/ui/` — it is generated.
2. `Grep` for a similar existing component to copy prop shape and Tailwind usage.
3. Confirm prop types will live in `src/types/component.types.ts`.

## Tests-first plan

- Vitest render test: renders each prop variant + empty/edge props.
- jsx-a11y: assert `alt-text` on images and `label`/`aria` on any interactive control.

## Implementation steps

1. Create `src/components/<domain>/<name>.tsx`.
2. Signature returns `React.ReactElement`; props typed via an extracted type in `src/types/component.types.ts`.
3. Use shadcn/ui for ALL form controls — no raw `<select>`/`<input>`/`<textarea>`. No `dangerouslySetInnerHTML`.
4. Style with semantic Tailwind classes (`bg-card`, `text-muted-foreground`, `border-border`) + `cn()` from `@/lib/utils`; no `dark:` prefixes (CSS variables handle theme); mobile-first `sm:/md:/lg:`.
5. Extract any repeated sub-view to its own `.tsx` — no inline sub-component functions.
6. All text via `t('key')`; register in 13 locales + `i18n.types.ts` (`./add-i18n-key.md`).
7. Emit event handlers via props (`onSelect`, `onDelete`) — the component never mutates or fetches.

## Security considerations

- Never render raw HTML from untrusted strings (`no-danger` is an ESLint error).
- Do not surface secret fields even if present on a prop object; render only intended fields.

## Failure modes

- Raw HTML form element instead of shadcn primitive → lint/architecture violation.
- Component fetching data internally → move to hook + container.
- `dark:` classes or raw color classes for semantic meaning → use CSS variables + semantic classes.

## Validation commands

`cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build`. Never `--no-verify`.

## Documentation updates

- Add to the component list in the relevant `docs/05-frontend/*` doc if it is a reusable/shared component.

## Definition of done

- Props-only; shadcn controls; no inline sub-components/types; theming via CSS variables; a11y clean; i18n atomic; validation lane green.
