# Frontend E2E Standard

Browser-driven end-to-end journeys with **Playwright**, against the real UI
(`https://claw.local`). This layer catches defects the type system and unit gates
cannot see — raw i18n keys rendering, boundary field-name drift, broken states.

## Why this layer is non-negotiable here

Several real defects passed typecheck, lint, and unit tests and were only caught in a
browser: raw `admin.policies.title` keys rendered because `t()` is stringly-typed; a
renamed FE field produced `Invalid Date`. See
[`../memory/known-pitfalls.md`](../memory/known-pitfalls.md). E2E is the layer that sees
what the user sees.

## Journeys to cover (risk-based)

Pick journeys by user value and risk, not by count:

- **Golden path** for each core flow (login → send a chat message → see the assistant
  reply; connect a connector; browse the model catalog).
- **Every visible state** on new pages: loading, empty, error, success. A page without
  all four is incomplete (`CLAUDE.md`).
- **Failure handling:** mutation error surfaces a toast + dismissable banner; per-row
  busy state (`pendingId`) disables only the acting row.

## Cross-cutting checks (run on representative journeys)

- **i18n render check:** switch to a non-English locale (e.g. `de`, `ar`) and assert no
  raw key strings (`/^[a-z]+\.[a-z.]+$/`-looking text) render. This is the cheapest
  catch for the stringly-typed `t()` trap.
- **RTL:** with Arabic, assert layout mirrors correctly.
- **Dark mode:** assert no invisible text and no white flashes (CSS variables, no `dark:`
  prefixes).
- **Mobile viewport (375×812):** assert no horizontal overflow.
- **Accessibility smoke:** tab order, focus rings, labels — see
  [accessibility-testing-standard](accessibility-testing-standard.md).

## Practices

- Select by role/label/test-id, not brittle CSS chains.
- Wait on state (`expect(...).toBeVisible()`), never fixed sleeps.
- Keep journeys independent and idempotent; seed/clean their own data.
- The dev frontend container needs `docker restart claw-frontend` to pick up edits
  (Turbopack doesn't watch the Windows bind mount).

## Determinism

No fixed sleeps; pin locale/timezone; mock only truly external third parties at the
network layer if needed. Flaky E2E is quarantined and fixed per
[flaky-test-policy](flaky-test-policy.md) — never `.skip`'d silently.

## Related

- [Accessibility testing](accessibility-testing-standard.md) · [Visual testing](visual-testing-standard.md) ·
  [`../memory/frontend-patterns.md`](../memory/frontend-patterns.md)
