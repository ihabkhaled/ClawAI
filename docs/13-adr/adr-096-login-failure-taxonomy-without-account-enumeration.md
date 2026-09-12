# ADR-096: A login tells you why, only after you have proved the account is yours

- **Status**: Accepted
- **Date**: 2026-09-12
- **Deciders**: Platform / Backend / Frontend
- **Related**: [rules/43](../../rules/43-account-state-disclosure-and-transactional-email.md) ·
  [rules/16](../../rules/16-authentication-and-authorization.md) ·
  [rules/21](../../rules/21-security-and-secrets.md) ·
  [service-guide-auth](../04-backend/service-guide-auth.md)

## Context

Two requirements pull in opposite directions, and the product needs both.

**The usability one.** A user who registered, never opened the confirmation
email, and then tried to sign in got `INVALID_CREDENTIALS` — "Invalid email or
password". Their password was correct. The real problem was that the account was
`PENDING`, and nothing anywhere said so. Registration made this worse by
redirecting to `/login` under a green "Account created successfully" toast, so
the sequence a new user experienced was: success, then an unexplained failure,
with no mention that an email was even sent.

**The security one.** A login form that distinguishes "no such address" from
"wrong password" is an account-enumeration oracle. Anyone can submit a list of
addresses and learn which ones are registered — which is the first step of a
credential-stuffing campaign and, for some products, a privacy breach in itself
(knowing that a given address has an account here is information).

The old ordering was the worst of both. It leaked and it did not help:

```ts
const user = await findUserByEmail(email);
if (!user) throw new InvalidCredentialsException();      // returns in ~1ms
if (user.status === SUSPENDED) throw new AccountSuspendedException();  // LEAK
if (user.status !== ACTIVE) throw new InvalidCredentialsException();   // unhelpful
if (!await verifyPassword(...)) throw new InvalidCredentialsException();
```

`ACCOUNT_SUSPENDED` fired before the password was ever checked, so any stranger
could confirm that an address had an account here simply by seeing a 403 instead
of a 401. And the unknown-email branch returned before the argon2 call, so even
the two identical-looking responses were distinguishable with a stopwatch.

## Decision

**Check the password FIRST, always. Disclose account state only after it
verifies.**

```ts
const user = await findUserByEmail(email);
const isValid =
  user === null
    ? await burnPasswordVerification(password) // same argon2 cost, always false
    : await verifyPassword(user.passwordHash, password);
if (user === null || !isValid) throw new InvalidCredentialsException();

if (user.status === SUSPENDED) throw new AccountSuspendedException();
if (user.status === PENDING) throw new EmailNotVerifiedException();
```

The reordering is the whole decision. It splits every refusal into two classes
by a single question: **has the caller proved this account is theirs?**

| Case                        | Response                   | Why                                                                                                  |
| --------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Unknown address             | `INVALID_CREDENTIALS`, 401 | Nothing proved.                                                                                      |
| Wrong password              | `INVALID_CREDENTIALS`, 401 | Nothing proved. Byte-identical to the row above.                                                     |
| Right password, `PENDING`   | `EMAIL_NOT_VERIFIED`, 403  | Ownership proved — naming the problem reveals nothing new, and is the only thing that unblocks them. |
| Right password, `SUSPENDED` | `ACCOUNT_SUSPENDED`, 403   | Ownership proved.                                                                                    |

**`burnPasswordVerification` closes the timing channel.** Identical response
bodies are not enough if one branch returns in a millisecond and the other pays
for a full argon2id verification — the difference is trivially measurable over a
network. The unknown-email branch now verifies the supplied password against a
per-process decoy hash and returns `false`, so both branches cost the same. It
never throws: a decoy that fails to verify is the expected outcome.

**403 for the two named states, not 401.** The request WAS authenticated; it is
the account's state that refuses it. A 401 would additionally send the web
client into its token-refresh path, which has nothing to refresh.

**The frontend never renders the server's message.** `classifyLoginFailure` maps
the error CODE to a `LoginFailureReason`, and `resolveLoginFailureCopy` maps that
to i18n keys. The server's own message is written for a log reader, is only ever
English, and for a bad sign-in says "Invalid email or password" — the exact
phrasing this decision rejects, because it invites the reader to guess which half
was wrong when the server deliberately refuses to say. An unrecognised error is
`UNKNOWN`, never `INVALID_CREDENTIALS`: telling somebody their password is wrong
when the real cause was a 502 sends them to reset a password that was fine.

**Registration lands on `/check-email`, not `/login`.** The account is `PENDING`
at that moment, so a sign-in attempt is guaranteed to fail. The new screen states
the blocking fact out loud, echoes the address, explains the three steps, and
offers the already-existing-but-never-called `resendVerification` endpoint. The
address travels in the query string because there is no session yet and cannot
be one; it is display text plus an argument to an endpoint that answers
`{ accepted: true }` for every address, so editing it teaches an attacker
nothing.

## What this decision does NOT change

**The register endpoint still returns `DUPLICATE_ENTITY` for a taken address.**
That is a real, knowing enumeration surface and it survives this ADR, because
the alternative — accepting the registration silently and emailing the existing
owner — is a materially worse user experience for the overwhelmingly common case
(a person who forgot they already have an account). It is recorded here as a
deliberate, bounded exception rather than an oversight, and it is the reason
rate limiting on `/auth/register` matters more than on `/auth/login`.

**Password reset and resend already did the right thing** and are untouched:
both return an unconditional `{ accepted: true }`, and the frontend's
forgot-password screen already showed a deliberately address-neutral success
message.

## Consequences

**Good.** The one failure a user can actually fix now says so, and says it with
a way out attached. Suspension no longer leaks. Response timing no longer leaks.
The three sign-in outcomes have distinct, translated copy in 13 languages instead
of one English sentence from a backend exception.

**Bad, and accepted.**

- **Every login now pays for an argon2 verification, including an unknown
  address.** That is the point — but it does mean a login flood costs the same
  CPU whether or not the addresses exist, so `/auth/login` rate limiting is doing
  real work and must not be relaxed.
- **A user who knows a valid password learns the account state.** That is
  intentional and is the entire mechanism, but it is worth stating: if a
  password is compromised, the attacker also learns whether the account is
  suspended.
- **Three existing tests had to change to supply a correct password** before
  asserting `ACCOUNT_SUSPENDED`, because that state is no longer reachable
  without one. A test that still passes an arbitrary password and expects a
  named state is asserting the old leak.

## Revisit when

- Rate limiting moves in front of `/auth/login` at the gateway rather than in
  the service — the decoy verification's cost model changes if the flood never
  reaches argon2.
- A product decision is made about `/auth/register`'s duplicate-address
  response, which is the one enumeration surface this ADR knowingly leaves open.
- Multi-factor authentication lands, which adds a fourth post-password state
  and a fourth branch to the taxonomy above.
