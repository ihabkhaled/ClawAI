# Unit Testing Standard

Fast, isolated tests of a single unit of behavior. Backend: **Jest** (`*.spec.ts`).
Frontend: **Vitest** (`*.test.ts` / `*.spec.ts`). Tests co-located in `__tests__/`.

## Scope

A unit test exercises ONE unit — a service method, a repository method, a manager
helper, a DTO schema, a mapper, a utility, a hook, or a component — with its boundaries
(DB, HTTP, RabbitMQ, Ollama, ClamAV) mocked.

- **Mock at boundaries only.** Never mock the unit under test.
- **No network, no real DB, no real broker** in a unit test.
- Test files have all ESLint restrictions off and may use `any` — but assert real
  behavior, not existence.

## What to assert

- **Behavior, not existence.** `.toBeDefined()`-only assertions are banned — assert the
  actual value, branch taken, or side effect.
- **Every branch on the risk surface** (see [testing-strategy](testing-strategy.md)):
  happy path, each boundary, each error branch, each authz/ownership decision.
- **DTO fuzz** for every Zod schema: valid + boundary (min/max length, array size) +
  invalid + null/empty/overflow. Every `z.string().max()` and `z.array().max()` bound is
  tested at and past the limit.
- **Manager/service error paths:** every `catch` branch is covered; assert the log and
  the rethrow/fallback.

## Backend example shape (Jest)

```ts
describe('ThreadService.rename', () => {
  it('renames when caller owns the thread', async () => {
    /* assert result */
  });
  it('throws FORBIDDEN when caller is not the owner', async () => {
    /* assert code */
  });
  it('throws EntityNotFound when the thread is missing', async () => {
    /* ... */
  });
  it('rejects a title over the max length', () => {
    /* DTO boundary */
  });
});
```

## Frontend example shape (Vitest)

- **Hooks** are tested in isolation (one hook = one responsibility). Assert query keys,
  mutation `onSuccess` invalidation, and `onError` surfacing.
- **Components** are pure render — test the rendered output for loading/empty/error/
  success props. No data fetching inside components.
- **Utilities** (format/parse/transform) get direct input→output tests including locale
  and edge cases.

## Banned in unit tests

- `.toBeDefined()`-only assertions.
- `xit` / `xdescribe` / `.skip` (CI rejects — see [flaky-test-policy](flaky-test-policy.md)).
- Mocking the unit under test.
- Hidden environment dependencies (ambient locale/time) — pin them.

## Coverage contribution

Unit tests carry most of the coverage load. Pure critical logic (schemas, mappers,
permission/ownership decisions, query-key builders, event validators) must reach **100%
branch** here — it's cheap to test exhaustively and expensive to get wrong. See
[coverage-policy](coverage-policy.md).

## Related

- [Testing strategy](testing-strategy.md) · [Coverage policy](coverage-policy.md) ·
  [Contract testing](contract-testing-standard.md) ·
  [`../memory/backend-patterns.md`](../memory/backend-patterns.md)
