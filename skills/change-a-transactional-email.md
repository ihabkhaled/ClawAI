# Skill — Change, add or translate a transactional email

**Use when**: you are editing the wording of an email the auth service sends,
adding a new one, adding a language, or debugging an email that arrived in the
wrong language or with a broken layout.

**Governing rule**: [rules/43](../rules/43-account-state-disclosure-and-transactional-email.md) ·
**Decision**: [ADR-096](../docs/13-adr/adr-096-login-failure-taxonomy-without-account-enumeration.md)

---

## The map

Everything lives under `apps/claw-auth-service/src/modules/auth/`:

| You want to change                        | File                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The words of an existing email            | `email/copy/<locale>.copy.ts` — **all 13**, `en.copy.ts` first                                   |
| The layout, branding, button, colours     | `email/utilities/auth-email-render.utility.ts` + `email/constants/auth-email-theme.constants.ts` |
| Which email is sent, and with what values | `adapters/auth-email.adapter.ts`                                                                 |
| How a recipient's language is found       | `services/auth-email-recipient.service.ts`                                                       |
| How long a link lasts, in words           | `email/constants/auth-email-expiry.constants.ts`                                                 |
| The list of emails that exist             | `enums/auth-email-kind.enum.ts`                                                                  |

Send sites: `services/email-verification.service.ts`,
`services/password-reset.service.ts`, `services/email-change.service.ts`,
`modules/users/services/users.service.ts` (temporary password).

## Reword an existing email

1. Edit `en.copy.ts`. It is the source of truth.
2. Edit the other 12 copy files to match. Keep the same number of `bodyLines`,
   the same `null` fields, and every `{value}` / `{expiry}` placeholder.
3. `npx jest src/modules/auth/email` — the completeness suite checks all of the
   above per locale, so a drifted file fails here rather than in someone's inbox.

Do not "temporarily" leave 12 files in English. The type will accept it and
nothing else will catch it; that is exactly what rule 43 §4 exists to prevent.

## Add a new email

1. Add a member to `AuthEmailKind`.
2. Every copy file now fails to compile. Fill in all 13 — that compile error is
   the enforcement.
3. If it needs a new duration, add a new `AUTH_EMAIL_EXPIRY_*` table (all 13
   languages) rather than formatting a number at the call site.
4. Add the adapter method. It takes `(recipient: AuthEmailRecipient, …)` — never
   a bare address — builds its URL from `PUBLIC_SITE_URL`, and calls `deliver`.
   **Write no HTML.**
5. At the send site, resolve the recipient:
   - you have a user id → `recipients.forUserId(userId, email)`
   - you have only an address → `recipients.forEmail(email)`
   - you are writing to an address that is not the account's own (the new
     address mid-change) → `recipients.forUserIdAtOtherAddress(userId, email)`
6. Test it in `email/__tests__/`.

## Add a language

1. Add it to `UserLanguagePreference` in `prisma/schema.prisma` + migration.
2. `npm run prisma:generate` in the service. Everything below now fails to
   compile until it is done — follow the errors:
   - a new `email/copy/<x>.copy.ts`, registered in `email/copy/index.ts`
   - a row in every `AUTH_EMAIL_EXPIRY_*` table
   - `AUTH_EMAIL_RTL_LOCALES` if it is right-to-left
3. Frontend: add the `Locale` enum member, the dictionary file, and the row in
   `localeToLanguage` / `languageToLocale`.

## An email arrived in the wrong language

Work backwards along the only path a locale can travel:

1. **Is `users.language_preference` right for that account?** It is set by
   `PATCH /users/me/preferences`, and at registration from the client's
   `languagePreference`.
2. **Did the send site resolve a recipient, or pass a bare address?** A bare
   address cannot compile any more, but a hand-built object literal can carry the
   wrong locale.
3. **Is it a registration email for a brand-new user?** Then it depends on the
   frontend sending `languagePreference` in the register payload — there is no
   session yet, so the default is `EN` if the client stays silent.
4. **Is it the deployment notification?** That one is English by design: it goes
   to the operator mailbox, which belongs to no account.

## An email looks broken in a real client

- **Styles missing entirely** — something added a `<style>` block or a `class`.
  Clients strip both. Inline styles only.
- **Layout collapsed in Outlook** — a `div`/flex layout crept in. Tables only.
- **Arabic or Persian reading left to right** — check `AUTH_EMAIL_RTL_LOCALES`.
- **A link that will not copy-paste in an RTL email** — the `<p>` around the URL
  must keep `dir="ltr"`.
- **Raw `{value}` in the body** — the adapter passed `value: null` for an email
  whose copy interpolates one. The render suite asserts no placeholder survives
  for any locale/kind pair.

## Before you commit

```bash
cd apps/claw-auth-service
npm run typecheck && npx jest src/modules/auth && npm run lint
```

Then rule 43's knowledge delta: if you changed the contract rather than the
words, the rule and ADR-096 are the places that say why.
