# Exceptions and waivers

A documented, time-boxed way to deviate from a rule — never a silent one. No
canonical rule may be permanently disabled by convenience; every deviation is
visible, owned, and expires.

## When an exception is needed

- An `eslint-disable` that isn't a narrow, single-line, justified suppression.
- Any `@ts-expect-error` (bare `@ts-ignore` is never allowed — see
  [../rules/00-non-negotiable-rules.md](../rules/00-non-negotiable-rules.md)).
- A coverage threshold temporarily below the [`testing/coverage-policy.md`](../testing/coverage-policy.md) target.
- A rule from `rules/` that genuinely cannot be satisfied for a documented reason.

## Required fields

Every exception, recorded in [`EXCEPTIONS.md`](EXCEPTIONS.md), MUST have:

| Field         | Meaning                                       |
| ------------- | --------------------------------------------- |
| ID            | Unique, e.g. `EXC-2026-07-24-001`             |
| Rule waived   | The exact `rules/NN-*.md` rule                |
| Scope         | Exact files/lines/workspace — never repo-wide |
| Justification | Why the correct fix isn't possible now        |
| Risk          | What could go wrong while this is open        |
| Mitigation    | What limits the risk in the meantime          |
| Owner         | Who is accountable                            |
| Reviewer      | Who approved it                               |
| Created       | Date                                          |
| Expires       | Date — exceptions are NOT permanent           |
| Removal plan  | The concrete follow-up that closes it         |
| Linked issue  | Tracking reference                            |

## Hard limits

- No permanent broad disables (`/* eslint-disable */` at file top is a review
  rejection, not an exception).
- No bare `@ts-ignore` — ever. Use `@ts-expect-error` with a one-line reason AND
  a linked exception if it will outlive the current PR.
- An exception past its expiration date is a release blocker — either fix the
  root cause or renew it explicitly with a new reviewer sign-off.
- `npm run knowledge:verify` and code review both check for undocumented
  disables; an `eslint-disable` with no matching `EXCEPTIONS.md` row is rejected.

## Emergency hook bypass

The one legitimate use of `--no-verify` is a documented incident procedure
(production outage, security response) requiring explicit authorization from
the release gatekeeper — never a normal development shortcut. Record it as an
exception immediately after, with the incident link as the justification.

See [`EXCEPTIONS.md`](EXCEPTIONS.md) for the live register.
