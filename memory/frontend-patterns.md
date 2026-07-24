# Frontend Lessons

Durable frontend lessons (Next.js 16, React 19, TanStack Query, Zustand, Tailwind,
shadcn/ui). See [README](README.md) for format.

---

### The wire shape is the contract — mirror BE field names, don't beautify them (2026-07-24, from 2026-05-10)

**What happened.** A FE type renamed `createdAt` → `receivedAt`; the field arrived as
`undefined`, dates rendered as `Invalid Date`, and typecheck stayed green.

**The durable lesson.** A locally-consistent type proves nothing about the payload it
decodes. Renaming a boundary field silently discards data.

**How to apply.** FE types copy BE DTO/Prisma names verbatim. Friendlier wording goes
in UI strings only. Against a `.strict()` BE schema, FE filter types are the exact
accepted-key set, never a superset. See [known-pitfalls](known-pitfalls.md).

**Related.** [testing/contract-testing-standard](../testing/contract-testing-standard.md).

---

### Stringly-typed `t()` needs a human eye (2026-07-24, from 2026-05-10)

**What happened.** Raw i18n keys (`admin.policies.title`) rendered to users because
`t(key: string)` accepts any string; a mismatch with the dictionary is invisible to
the compiler.

**The durable lesson.** Any untyped string lookup that ends up on screen must be
verified by rendering, not by gates. Green ≠ correct for stringly-typed paths.

**How to apply.** Verify each new `t()` key against the dictionary; spot-check one
non-English locale in the browser. Prefer making `t()` generic over the dictionary
long term.

**Related.** [known-pitfalls](known-pitfalls.md); i18n rules in `CLAUDE.md`.

---

### One controller hook per page; TSX is render-only (2026-07-24)

**What happened.** Business logic, inline hooks, and helper sub-components crept into
`.tsx` files, making them untestable and violating the extraction rules (caught
2026-05-31).

**The durable lesson.** A component that both fetches/derives and renders can't be
tested at either concern cleanly. Separation of render from logic is what makes the
hook unit-testable and the component snapshot-testable.

**How to apply.** Page → one controller hook → smaller hooks → repository. TSX
contains only component definitions. Extract types/enums/consts/utilities/hooks/
sub-components to their dedicated files per the frontend extraction table.

**Related.** `CLAUDE.md` → Frontend Architecture Rules;
[testing/frontend-e2e-standard](../testing/frontend-e2e-standard.md).

---

### Every mutation needs an `onError` with a user-visible surface (2026-07-24)

**What happened.** Silent `useMutation` failures left users staring at an unchanged
UI with no signal. Also, a single page-level `isMutating` flag disabled every row
when one row updated.

**The durable lesson.** A mutation with no error surface is a delivery blocker, and
per-row state is the default, not a polish item. Users must see both _that_ something
failed and _which_ row is busy.

**How to apply.** Every `useMutation` sets `onError` → toast + a dismissable banner
from local `mutationError` state. Track per-row work with `pendingId: string | null`;
derive `isMutating={pendingId === row.id}` per row.

**Related.** `CLAUDE.md` → Frontend Key Rules.

---

### Derive locale-sensitive sorting deliberately (2026-07-24)

**What happened.** List ordering shifted between environments because
`localeCompare` used the ambient locale (see [known-pitfalls](known-pitfalls.md)).

**The durable lesson.** Display order that must be stable can't depend on the host
locale.

**How to apply.** Pass an explicit locale to `localeCompare`/`Intl.Collator` for
user-facing sort; use codepoint comparison for machine-facing keys.
