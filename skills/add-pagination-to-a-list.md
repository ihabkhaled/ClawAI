# Skill — Put pagination on a list

**When you need this**: a table or list can grow past one screen, or someone
says they are "pressing Next forever".

Before 2026-09-20 every paged table here hand-rolled its own `Previous` /
`1 / 3` / `Next` row — eight copies, none of which offered a page number, a
page size, or a way to jump. There is now one control. Do not write a ninth.

All eight are migrated: admin users, admin feedback, audits, the three logs
tabs (client / server / audit) and the smart-router revisions tab. Every one of
them also hard-coded its `limit` (20, 25, or a constant), so the size control
would have changed nothing — that is the defect to look for first when you find
a ninth list.

**Related**: [`rules/03-frontend-rules.md`](../rules/03-frontend-rules.md) ·
[`rules/20-i18n-and-user-facing-messages.md`](../rules/20-i18n-and-user-facing-messages.md) ·
[`rules/49`](../rules/49-qa-team-discipline-and-test-evidence.md)

---

## The pieces

| Piece                                       | Where                                  | What it is                                             |
| ------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `Pagination`                                | `components/ui/pagination.tsx`         | The control: summary, rows-per-page, numbers, jump box |
| `usePagination`                             | `hooks/use-pagination.ts`              | `page` / `pageSize` state with the two rules below     |
| `buildPageWindow`, `clampPage`, `pageRange` | `utilities/pagination.utility.ts`      | Pure logic, tested on its own                          |
| `PAGE_SIZE_OPTIONS`, `DEFAULT_PAGE_SIZE`    | `constants/pagination.constants.ts`    | 10 / 20 / 50 / 100, default 20                         |
| `pagination.*`                              | all 13 locales + `types/i18n.types.ts` | Already translated — you add no new keys               |

## Wiring a list

```ts
// the hook that owns the list's filters
const { page, pageSize, goToPage, setPageSize, reset } = usePagination();

// every filter setter calls reset(), never setPage(1) by hand
const updateSearch = (value: string) => {
  setSearch(value);
  reset();
};

// the query sends the real size, never a hard-coded one
const query = { page, limit: pageSize, search: search || undefined };
```

```tsx
<Pagination
  page={page}
  pageSize={pageSize}
  totalPages={meta?.totalPages ?? 1}
  totalItems={meta?.total ?? 0}
  onPageChange={goToPage}
  onPageSizeChange={setPageSize}
  t={t}
/>
```

The backend already answers this shape: every list DTO here takes `page` and
`limit` (max **100**, which is why `PAGE_SIZE_OPTIONS` stops there) and returns
`{ data, meta: { total, page, limit, totalPages } }`.

## The rules that keep biting people

- **A filter change resets to page 1.** Filtering on page 6 and staying on
  page 6 shows an empty table for results that exist.
- **A page-size change resets to page 1.** Page 7 of 40 at 10 rows is not
  page 7 of 8 at 50 rows.
- **Never hard-code `limit: 20` in the query.** That was the actual defect on
  the admin users page: the size control would have changed nothing.
- **Never trust a typed page number.** The jump box produces `0`, `-4` and
  `NaN`; `clampPage` is what makes those land somewhere real.
- **`totalItems` comes from `meta.total`, not `rows.length`.** The last page is
  short, and "Showing 201-213 of 213" is the whole point of the summary.

## Agreed behaviour of the page strip

`buildPageWindow` shows first, last, current and one page either side, with
`…` for each run left out — a **constant** width that does not grow with the
total, so a 320px phone is safe. Two deliberate exceptions, both covered by
tests:

- A total of 7 or fewer renders every page: `1 2 … 5` is no narrower than
  `1 2 3 4 5` and hides pages for nothing.
- A gap that would hide exactly one page shows that page instead, for the same
  reason.

## Verify

```bash
cd apps/claw-frontend
npx vitest run src/utilities/__tests__/pagination.utility.test.ts \
  src/hooks/__tests__/use-pagination.test.ts \
  src/components/ui/__tests__/pagination.test.tsx
```

Then the browser, per [`rules/49`](../rules/49-qa-team-discipline-and-test-evidence.md):
change the page size while on a later page (it must land on page 1), click the
last page number, and check at 375px that the strip does not overflow. Test ids
are `pagination`, `pagination-summary`, `pagination-previous`,
`pagination-next`, `pagination-page-<n>`, `pagination-jump` and
`pagination-rows-per-page` — note the last one is deliberately NOT
`pagination-page-size`, because that prefix collides with `pagination-page-*`
in a `^=` selector.
