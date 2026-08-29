# 20 — i18n and User-Facing Messages

## Purpose

Every string a user can see is translatable and actually translated into all 13
locales. A German user must see German, an Arabic user an RTL German-equivalent —
never an English placeholder. This is a recurring failure mode; the rule exists to
end it.

## Applies to

`apps/claw-frontend/src/lib/i18n/locales/{en,ar,de,es,fa,fr,hi,it,ja,pt,ru,th,zh}.ts`,
`apps/claw-frontend/src/types/i18n.types.ts`, and every component/hook that renders text.

## Mandatory rules

1. **No hardcoded user-facing text.** Render via `t('key')` from `useTranslation()`.
2. **A new key is added to ALL 13 locales** — `en` first with the real English copy,
   then a real native translation for `ar, de, es, fr, hi, it, pt, ru`. Never copy
   English into the other files as a placeholder.
3. **`i18n.types.ts` is updated in the SAME change** as any locale key addition —
   the locales and the type are one atomic edit. Skipping the type breaks typecheck
   for everyone.
4. **RTL correctness for Arabic** — layouts must mirror; verify in the `ar` locale.
5. **Loanwords may be identical only when genuinely so** (brand names like
   `GitHub`/`Confluence`, units like `GB`/`ms`) — and only when you have confirmed
   it for that word in that language. "I don't know the Italian" → look it up, do
   not copy English.
6. **Spot-check a non-EN locale visually.** `t()` is NOT type-checked against the
   dictionary — a wrong key chain renders the raw key string to the user. Toggle to
   `de` or `ar` and confirm no raw `some.key.path` appears.
7. **Run the i18n guards before committing:**
   `npx vitest run src/lib/i18n` in `apps/claw-frontend`. Every flagged entry
   must be a real translation or a documented exempt loanword on the completeness
   test's allow-list.

## Prohibited patterns

- A literal string in JSX/TSX where a user can read it.
- Adding a key to `en.ts` (or all locales identically) but not to `i18n.types.ts`.
- Copying the English value into `de.ts`/`ar.ts`/… as a placeholder.
- Assuming `t('admin.policies.title')` is correct without confirming the key exists.

## Correct pattern

```ts
// en.ts → real English; de.ts → real German; … i18n.types.ts updated same change
t('routing.replay.suspiciousTab')          // FE call
// gate before commit, from apps/claw-frontend:
npx vitest run src/lib/i18n                 // key references, enum labels, completeness
```

## Enforcement

Each mechanism below **exists today**, under
`apps/claw-frontend/src/lib/i18n/__tests__/`. `tools/audit-untranslated-i18n.cjs`
was named here and never written; `.ai/manifests/i18n.json` holds a key count and
a locale list and flags nothing. Both claims are removed rather than left to
imply a coverage that was not there.

- **`i18n-key-references.test.ts`** — every literal `t('a.b.c')` and
  `*Key: 'a.b.c'` in the source resolves in the `en` dictionary. **Blind to keys
  used as VALUES of a `Record<Enum, string>`** — see the next entry, which exists
  because that blind spot shipped 18 undefined keys to the credit ledger.
- **`billing-enum-labels.test.ts`** — walks `SubscriptionStatus`,
  `BillingInterval`, `PlanFeature`, `BillingGateway`, `PaygSurface` and
  `CreditLedgerKind` against all 13 dictionaries. **Add any new enum you label by
  template or lookup map here**; nothing else will catch it.
- **`persian-locale-completeness.test.ts`, `{japanese,thai,chinese}-completeness.test.ts` and
  `western-locales-translation-regression.test.ts`** — catch English left
  untranslated, with an explicit allow-list of approved technical terms.
- **`supported-locales.test.ts`** — every `Locale` member has a dictionary.
- **TS config** — an `i18n.types.ts` mismatch fails `npm run typecheck`.
- **Review checklist** — visual spot-check of one non-EN locale.

## Related skills

- [03-feature-scaffold](../skills/03-feature-scaffold.md)

## Related context

- Root `CLAUDE.md` — "i18n Rules", "NEVER leak English into non-English locales".

## Definition of done

- [ ] Every new string via `t()`, present in all 13 locales as real translations.
- [ ] `i18n.types.ts` updated in the same change.
- [ ] `npx vitest run src/lib/i18n` green in `apps/claw-frontend`; one non-EN
      locale spot-checked in the browser.
