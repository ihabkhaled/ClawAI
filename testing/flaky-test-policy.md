# Flaky Test Policy

A flaky test — one that passes and fails without a code change — is a bug in the test.
It erodes trust in the whole suite ("just re-run it") until real failures get ignored.
Flakes are fixed, not tolerated.

## Zero-tolerance stance

- **Never `.skip` / `xit` / `xdescribe` a flake to make CI green.** CI rejects these
  markers. Skipping hides the signal instead of fixing it.
- **Never blanket-retry** a whole suite to paper over flakes. A targeted retry on a
  genuinely non-deterministic external boundary is allowed only with a linked issue and
  an expiry — treat it like an [exception/waiver](../docs/exceptions/README.md).

## Common flake sources here (and the fix)

| Source                                                       | Fix                                                                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `localeCompare` / locale-sensitive sort using ambient locale | Pin locale explicitly, or use codepoint comparison for machine ordering ([`../memory/known-pitfalls.md`](../memory/known-pitfalls.md)) |
| Ambient clock / `Date.now()`                                 | Freeze time / inject a clock                                                                                                           |
| Fixed `sleep()` waiting for async                            | Wait on a condition/state, never a duration                                                                                            |
| Test-order dependence (shared DB state)                      | Isolate: transaction rollback / truncate per test                                                                                      |
| Real network to a boundary                                   | Mock the boundary; only E2E touches the real stack                                                                                     |
| Unpinned randomness                                          | Seed it                                                                                                                                |
| SSE/stream timing                                            | Assert on received events with a bounded wait, not a sleep                                                                             |

## Quarantine process (bounded, never permanent)

1. **Detect:** a test fails non-deterministically (CI flake, local intermittent).
2. **Quarantine with a ticket:** move it behind a documented, issue-linked quarantine tag
   — NOT a silent `.skip`. The quarantine is visible and tracked.
3. **Root-cause:** find the real non-determinism (systematic-debugging, not "re-run and
   hope). A flake is a defect with a root cause like any other.
4. **Fix and de-quarantine:** the fix removes the non-determinism; the test returns to the
   suite. Close the ticket.
5. **Expiry:** a quarantined test with no progress by its expiry is escalated — it is
   never allowed to live in quarantine indefinitely.

## Prevention

- Deterministic fixtures ([test-data-and-fixtures](test-data-and-fixtures.md)).
- Mock only at boundaries; never mock the unit under test.
- No fixed sleeps in E2E; wait on state.
- Pin locale and time anywhere behavior depends on them.

## Related

- [Test data & fixtures](test-data-and-fixtures.md) · [Quality gates](quality-gates.md) ·
  [`../docs/exceptions/README.md`](../docs/exceptions/README.md)
