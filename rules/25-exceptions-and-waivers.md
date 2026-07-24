# 25 — Exceptions and Waivers

## Purpose

Rules are strict, but reality occasionally requires a documented, bounded
deviation. This rule defines the ONLY legitimate way to deviate — so that every
exception is visible, justified, time-boxed, and reviewable. An undocumented
bypass is a defect, not an exception.

## Applies to

Any request to deviate from a rule in this catalog — a suppressed lint rule, a
`@ts-expect-error`, a temporarily lowered check, an env escape hatch, or a
knowingly deferred requirement.

## Mandatory rules

1. **No silent bypass.** A deviation is legitimate only if it is written down with
   justification. `eslint-disable`, `@ts-expect-error`, `--no-verify` (to skip a
   real failure), or a lowered threshold with no waiver are prohibited.
2. **Waivers are explicit and located with the code.** A suppression carries an
   inline reason and a pointer, e.g. an ADR under `docs/13-adr/` or a note in the
   feature plan under `.claude/Integrations/<feature>__PLAN.md`.
3. **A waiver states:** which rule, why it cannot currently be met, the blast
   radius, the mitigation, and the removal condition (what makes it go away).
4. **Waivers are time-boxed / tracked** — recorded in `docs/14-risk-debt/`
   (technical-debt register) when they outlive the change, not left implicit.
5. **The non-negotiables in [00](00-non-negotiable-rules.md) are not waivable** by
   this process — no waiver permits secret exposure, cross-DB access, `any`, hook
   bypass to hide a failure, or shipping untested behavior.
6. **Escape-hatch env flags follow the same discipline.** Documented flags (e.g. a
   dual-write disable) are safe-mode-off by default and carry a removal plan; they
   are not a way to permanently skip a rule.
7. **Reviewer authority.** A code reviewer seeing a waiver may reject it if the
   justification is weak or the removal condition is missing — the burden is on the
   author.

## Prohibited patterns

- `// eslint-disable-next-line` with no reason and no waiver reference.
- `@ts-expect-error` used to paper over a real type bug.
- Lowering `coverageThreshold` and calling it "temporary" without a tracked entry.
- Treating a documented escape-hatch flag as a permanent exemption.

## Correct pattern

```ts
// WAIVER(rule 12): third-party type is `any` at the SDK boundary; narrowed immediately below.
// Justification + removal condition: docs/13-adr/0NN-<topic>.md ; remove when upstream ships types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw = sdk.call() as unknown;
```

## Enforcement

- **Review checklist** — every suppression must cite a waiver; unjustified ones are
  rejected.
- **CI job / knowledge check** — suppressions and threshold changes are surfaced in
  the diff for review; non-negotiables have no waiver path and stay hard-failing.

## Related skills

- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)

## Related context

- `docs/13-adr/` (decision records), `docs/14-risk-debt/` (debt register).
- Root `CLAUDE.md` — "Honest-status mindset", "Root-cause mindset".

## Definition of done

- [ ] Every deviation has an inline reason + a linked waiver (ADR or plan).
- [ ] Waiver states rule, reason, blast radius, mitigation, removal condition.
- [ ] No non-negotiable ([00](00-non-negotiable-rules.md)) was waived.
- [ ] Surviving waivers recorded in the debt register.
