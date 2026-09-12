# Rule 43 — Account-state disclosure, and transactional email

**Applies to**: `apps/claw-auth-service`, `apps/claw-frontend` (the `(auth)` route
group), and any future service that authenticates a human or emails one.

**Related**: [ADR-096](../docs/13-adr/adr-096-login-failure-taxonomy-without-account-enumeration.md) ·
[rules/16](16-authentication-and-authorization.md) ·
[rules/20](20-i18n-and-user-facing-messages.md) ·
[rules/21](21-security-and-secrets.md) ·
[skills/change-a-transactional-email.md](../skills/change-a-transactional-email.md)

---

## 1. Never answer a question the caller has not earned

**An endpoint that takes an email address and behaves differently depending on
whether that address has an account is an enumeration oracle.** It does not
matter that the responses are both errors, or that the difference is only a
status code, or that nobody would think to look.

The test is not "are the messages the same?" It is:

> Could someone with a list of ten thousand addresses tell which ones are
> registered, using anything they can observe?

Anything includes the status code, the error code, the body, the response time,
and the presence or absence of a subsequent email.

**The mechanism** (ADR-096): verify the password FIRST, unconditionally, before
any branch on account state. Only after it verifies has the caller proved the
account is theirs — and only then may the response name what is wrong.

```ts
// CORRECT — ownership proved before anything is disclosed
const isValid = user === null
  ? await burnPasswordVerification(password)
  : await verifyPassword(user.passwordHash, password);
if (user === null || !isValid) throw new InvalidCredentialsException();
if (user.status === SUSPENDED) throw new AccountSuspendedException();
if (user.status === PENDING)   throw new EmailNotVerifiedException();

// WRONG — 403 vs 401 tells a stranger the address is registered
if (user.status === SUSPENDED) throw new AccountSuspendedException();
if (!await verifyPassword(...)) throw new InvalidCredentialsException();
```

**Equal responses are not enough; equal COST is also required.** An unknown
address that returns before the hashing call answers in a millisecond while a
known one pays for argon2id. Use `burnPasswordVerification(password)` on the
miss branch — it spends the same work and returns `false`.

**An endpoint that only takes an address — password reset, resend verification —
returns the same accepted response for every address, always.** No status
difference, no timing difference, no "we couldn't find that account".

**The one recorded exception is `POST /auth/register`**, which returns
`DUPLICATE_ENTITY` for a taken address. It is a deliberate product trade recorded
in ADR-096, not a precedent. Do not cite it to justify a second one.

## 2. Never render a backend error message to a user

Backend messages are written for a log reader, are only ever English, and often
say precisely the thing the product has decided not to say. Map the error **code**
to a typed reason, and the reason to i18n keys.

```ts
// CORRECT
failureCopy: isError ? resolveLoginFailureCopy(classifyLoginFailure(error)) : null

// WRONG — renders 'Invalid email or password' in English to a Japanese user
description={error?.message ?? t('auth.loginFailed')}
```

**An unrecognised error is UNKNOWN, never the most likely guess.** Reporting
"wrong password" for what was actually a 502 sends the user to reset a password
that was never broken.

## 3. A refusal the user can fix must say so, and offer the fix

If exactly one of your failure states is recoverable by the person reading it,
that state gets its own copy and its own action. The others get copy and no
action — a button that cannot help is worse than no button.

A screen that says "request a new link" must contain somewhere to request one.

## 4. A transactional email is localised, or it is not finished

**Every email to a human account holder is sent in that account's
`languagePreference`.** All 13 languages, real translations, in the same commit —
the same standard rule 20 holds UI text to. The only emails exempt are those sent
to an operator mailbox (`CONTACT_EMAIL_TO`), which belongs to no account and has
no language to be sent in.

**Mechanically enforced**: `AUTH_EMAIL_DICTIONARIES` is typed
`Record<UserLanguagePreference, AuthEmailDictionary>`, so a missing language is a
compile error, not a silent English fallback. There is deliberately **no runtime
fallback by locale** — a silent fallback is indistinguishable from a translation
nobody noticed was missing.

**A send site takes a recipient, never a bare address.**

```ts
// CORRECT — cannot compile without a locale
sendVerification(recipient: AuthEmailRecipient, rawToken: string)

// WRONG — structurally incapable of localising
sendVerification(email: string, rawToken: string)
```

Resolve the recipient with `AuthEmailRecipientService`. It never throws and never
refuses: an address with no matching user (the change-completed notice, which
goes to an address that has just stopped being the account's) falls back to
English rather than failing to deliver.

## 5. Copy files carry text. The renderer owns every tag.

**No email template may contain markup, and no send site may build HTML.** The
adapter hands structured values to `renderAuthEmail`, which owns the layout and
escapes everything it is given.

This is a security rule as much as a tidiness one: the previous adapter
interpolated a user-controlled masked email address into an HTML string literal.
Escaping in one place makes that class of bug unreachable rather than fixed once.

- **Tables and inline styles only.** Gmail, Outlook and Apple Mail all strip
  `<style>` blocks. A layout that renders in a browser and collapses in Outlook
  is not a layout.
- **RTL is part of the translation.** `ar` and `fa` get `dir="rtl"` and
  right-aligned text — except the literal URL, which stays `dir="ltr"` or it
  reorders into an address that does not survive copy-and-paste.
- **Durations are phrased per locale, not formatted.** Russian declines by count,
  Arabic has a dual form, Japanese places the counter differently. A generic
  `${n} ${unit}` helper is grammatically wrong in most of them — use the
  `AUTH_EMAIL_EXPIRY_*` tables.

## 6. What a completeness test must check

The type system proves every language and every email kind EXISTS. It cannot
prove the translation is a translation. A copy suite must assert, per locale and
per email:

- the same number of `bodyLines` as English (a merged paragraph renders differently);
- `null` in exactly the same optional fields (an email with no button cannot grow one);
- every `{value}` / `{expiry}` placeholder English uses is still present (a
  dropped one is invisible in review and silently omits the code the email exists
  to deliver);
- no empty strings, no `TODO`.

See `auth-email-copy-completeness.spec.ts`.

---

## Enforcement

| What                                          | Where                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordering, timing and response parity of login | `auth.manager.spec.ts` — asserts the unknown-address and wrong-password bodies, codes and statuses are identical, and that `burnPasswordVerification` is called |
| A missing language                            | Compile error on `AUTH_EMAIL_DICTIONARIES` (backend) and on each `TranslationDictionary` (frontend)                                                             |
| A shallow or broken translation               | `auth-email-copy-completeness.spec.ts` (backend), `src/lib/i18n/__tests__/*` (frontend)                                                                         |
| Escaping and RTL                              | `auth-email-render.utility.spec.ts`                                                                                                                             |
| A `t()` key that does not exist               | `src/lib/i18n/__tests__/i18n-key-references.test.ts`                                                                                                            |
