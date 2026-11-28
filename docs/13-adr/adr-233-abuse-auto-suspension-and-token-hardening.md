# ADR-233 — Automatic, reversible suspension of abusive accounts; banned devices; session-closing fixes

- **Status:** Accepted
- **Date:** 2026-11-28
- **Deciders:** owner (order of 2026-11-28), lead agent
- **Context links:** [ADR-222](adr-222-sign-up-abuse-defences-and-internal-surfaces.md) (device hashes, one trial per
  device, the farm accounts), [ADR-230](adr-230-security-rate-limits-fail-closed.md) (fail-closed limiters),
  [ADR-106](adr-106-multi-tab-sessions-and-remember-me.md) / [ADR-112](adr-112-revoked-sessions-stop-at-the-guard.md)
  (sessions, revocation), [ADR-200](adr-200-admin-can-ban-set-passwords-and-see-presence.md) (the ban this builds on),
  [rules/16](../../rules/16-authentication-and-authorization.md), [rules/43](../../rules/43-account-state-disclosure-and-transactional-email.md),
  [service guide, "Abuse defence"](../04-backend/service-guide-auth.md#abuse-defence-adr-233)

## Context

Owner order, 2026-11-28: "DDoS from the same script, device or VM; block suspicious devices; hacking trials caught,
blocked and banned, and their user in ClawAI gets banned; secure tokens, JWT, sessions and state."

What existed: per-route limiters keyed on address (ADR-147, fail closed since ADR-230), proof of work and captchas on
sign-up and on sign-in after failures, one trial per device (ADR-222), an admin ban (ADR-200) and session revocation
(ADR-112). What did not: nothing reacted to an account that was **already signed in** and then hammered, probed or
scanned; a banned account's machine could open a new account the next minute; and a few session closers did not
actually close the access token.

## The rule that shapes everything

**A victim is never punished.** What an attacker does TO an account (failed sign-ins, guessed tokens, floods against its
address, a stolen refresh token) is the attacker's act. It slows or blocks the attacker's address and device (the
existing limiters) and never suspends the account it targets. Only a signal produced by the actor's OWN valid access
token can count towards suspending that account. Everything below follows from this.

## Decision

### 1. Signals (`AbuseSignalCode`) and what they can do

| Signal                 | Source (wired today)                                                                                       | Counts toward suspension | Why                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `RATE_LIMIT_TRIPPED`   | auth-service global exception filter: a 429 on a request that carried a valid access token                 | yes                      | The global throttler keys an authenticated request on the user id, so the budget spent is the account's own.       |
| `FORBIDDEN_PROBE`      | the same filter: Nest's plain `ForbiddenException` from the role / permission guards, with a valid token   | yes                      | A token asking for routes it may not use. A `BusinessException` 403 (self-ban, banned account) is not a probe.     |
| `SSRF_REFUSED`         | `POST /internal/abuse/signals` (service token): another service reports its SSRF guard refused the account | yes                      | Reportable by any service; **no service calls it yet** (open item).                                                |
| `TOKEN_REUSE`          | `TokenSessionManager.rotate`: a refresh token replayed after rotation (past the 30 s grace)                | **never**                | Whoever replays a token is not the account's authenticated self; the family is revoked and an admin sees the flag. |
| `BANNED_DEVICE_SIGNIN` | `LoginScreeningService.recordSuccess`: an existing account signed in on a device a banned account used     | **never**                | Family and office machines are shared. Flag for an administrator, nothing else.                                    |

A request with no valid token has no `user`, so a failed sign-in, a bad token or a flood on a public route produces no
signal for anyone. The existing sign-up velocity, device trial and network rules of ADR-222 are unchanged and already
refuse; they are not re-counted here.

### 2. Thresholds, durations and the kill switch (DB-level, conservative)

All values live in `SystemSetting` under `security.abuse.*` (editable through the admin system-settings API, cached 15 s
per replica). Absent, empty, unparseable or out-of-range reads as the default, so a typo cannot make a threshold
aggressive. The `abuse-defense` seeder v1 creates the nine rows so they are visible; it never overwrites an edit.

| Key (`security.abuse.` +) | Default | Bounds        | Meaning                                                                                |
| ------------------------- | ------- | ------------- | -------------------------------------------------------------------------------------- |
| `autoSuspendEnabled`      | `true`  | true / other  | Kill switch. **OFF records every signal and suspends nobody.**                         |
| `windowMinutes`           | 15      | 1 - 1440      | Fixed counting window.                                                                 |
| `rateLimitTrips`          | 300     | 1 - 1,000,000 | 429s on authenticated routes in one window (a stuck client does not reach this).       |
| `forbiddenProbes`         | 200     | 1 - 1,000,000 | Role / permission refusals in one window (a polling bug does about 10 an hour).        |
| `ssrfRefusals`            | 10      | 1 - 1,000,000 | SSRF-guard refusals in one window (one is a typo, ten is a scan).                      |
| `firstSuspensionMinutes`  | 60      | 1 - 525,600   | Rung 1.                                                                                |
| `secondSuspensionMinutes` | 1440    | 1 - 525,600   | Rung 2 (24 h).                                                                         |
| `thirdSuspensionMinutes`  | 10,080  | 1 - 525,600   | Rung 3 (7 d), repeated for every later suspension.                                     |
| `escalationWindowDays`    | 30      | 1 - 365       | A suspension older than this, or one an administrator lifted, no longer counts upward. |

### 3. The response: temporary, escalating, reversible

- At the threshold the account is suspended for the next rung of **1 h, 24 h, 7 d**. Never permanent: a permanent ban is
  only ever an administrator's act.
- The suspension **is the existing ban** (`users.banned_at / banned_until / ban_reason = 'AUTO_ABUSE:<code>'`,
  `banned_by_user_id = NULL`), so sign-in, refresh and every admin tool already honour it, and a timed ban lifts itself
  by the clock. `abuse_suspensions` is the audit row (level, reason code, **evidence counts only**, who lifted it); both
  are written in one transaction.
- Every session is closed AND the ids are published (ADR-112), so the account's access tokens stop working now.
- Never applied to an `ADMIN` or the super administrator (a probing admin is a human's call, and locking the last admin
  out is worse than the abuse). The threshold crossing is logged instead.
- **Lifting is the existing unban** (`POST /users/:id/unban`), extended: it marks the running suspension lifted (who,
  when) and lifts the account's banned-device marks. `GET /admin/users/:userId/abuse` shows suspensions (active, lifted,
  served), stored signal buckets and the two flags.
- One decision per minute per account (Redis lock), so two signals landing together cannot suspend twice.

### 4. Banned devices

A **lifetime** ban (an administrator's) marks every peppered device hash the account used (`banned_device_marks`; the
same HMACs as `user_devices`, no raw value). Then:

- A **new sign-up** from a marked device is refused after the bot check, before anything that costs DNS or a counter:
  `403 SIGNUP_UNAVAILABLE`, a generic code with no reason and no retry hint. It depends on the device alone, never on
  the address, so it is no enumeration oracle (rule 43).
- **Other existing accounts** on that device are NOT banned. Their next sign-in writes a `login_on_banned_device` event
  and an uncounted `BANNED_DEVICE_SIGNIN` signal for an administrator.
- A timed ban or an automatic suspension marks nothing: a cooling-off is not a verdict on the machine.
- The mark has **no foreign key** to the user: deleting the abusive account must not free its device. Unbanning the
  source account lifts the marks. The seeder backfills the accounts already banned for life.
- A request that sent no `device` object cannot be matched. ADR-222 already gives such a sign-up no trial.

### 5. What the user sees (rule 43)

An automatic suspension is an `ACCOUNT_BANNED` reply (only after the password verified, or on a refresh token the caller
already holds) with `bannedUntil` and `autoSuspended: true`. The client says "This account is temporarily suspended ...
unusual activity ... you can sign in again after {date}" in all 13 languages. It never names a signal, a count or a
threshold, and the reason string stays off the wire.

### 6. Token, JWT and session audit and fixes

The full table (finding, file:line, fixed or recommended) is in the
[service guide](../04-backend/service-guide-auth.md#token-jwt-and-session-audit-2026-11-28). Fixed here, because each
was a plain bug:

1. **Password reset** hard-deleted the user's sessions and published nothing, so an intruder's access token worked for
   up to 15 minutes after the reset that was meant to shut them out; and it wrote the new password before claiming the
   single-use token, so two requests with one token both rewrote it. Now: claim first, close with a reason, publish.
2. **Deactivating an account**, **issuing a temporary password** and **renaming** closed sessions without publishing the
   ids (same 15-minute hole). All closers now publish.
3. **Changing your own password** closed nothing. It now closes every OTHER login (the device in use keeps its session,
   like a rename) and publishes. This is user-visible: other devices are signed out.

Recommended, not changed (user impact or design): an absolute session lifetime (refresh slides forever), argon2
`needsRehash` on sign-in, an asymmetric JWT key, `verifyAccessToken<T>` (the generic variant) checking issuer and
audience, and removing the timing difference of the password-reset request (the SMTP send is awaited for a known
address only).

## Alternatives considered

- **Count failed sign-ins against the targeted account.** Rejected outright: it hands an attacker a one-line way to
  suspend anyone. Failed sign-ins keep slowing the attacker's address (ADR-147, ADR-222).
- **Suspend on a replayed refresh token.** Rejected: the owner is the victim of that theft. The family is revoked,
  which already shuts the thief out; an administrator sees the flag.
- **Ban every account on a banned device.** Rejected: shared family and office machines. Refusing new sign-ups and
  flagging the rest catches the farm without punishing a household.
- **Permanent automatic bans.** Rejected: automatic detection must be reversible by design; the ladder tops out at 7 d
  and an administrator decides what is permanent.
- **A separate lift control and a new "suspended" status.** Rejected: duplicate tooling. Reusing the ban columns means
  every sign-in path (password, VS Code, device) is already gated by `AccountBanGateService`.
- **New environment variables.** Rejected (DB-level settings rule): rows, not `.env`.

## Consequences

- A user whose own token trips a threshold is signed out of every device and refused for the rung's duration, with a
  clear message. At the defaults a normal heavy user never gets near it. A stolen access token used to flood would
  suspend its owner for rung 1 and close that session, which is the right containment; the administrator can lift it.
- Detection needs Redis (counters fail open: no counting, no suspension, the request is unaffected). Signals are
  stored at most once a minute per (account, code), so a flood costs a row a minute, not a row a request.
- `abuse_signals` has no retention job yet (bounded growth: one row a minute per active flood).
- Other services must call the internal route to feed `SSRF_REFUSED` (and any per-service 429 / 403 signal); until
  they do, only auth-service's own authenticated 429s and 403s count.
- Deploy: the additive migration `20261128120000_abuse_auto_suspension_and_banned_devices` must be applied before the
  new code serves sign-ups (the banned-device lookup reads `banned_device_marks`). Rollback needs no schema change.

## What would make this stale

A change to the throttler key (if it stopped being the user id for authenticated requests, 429 would no longer be the
account's own act), a second way to sign in that skips `AccountBanGateService`, a service that starts reporting signals,
or a decision to let automation ban permanently.
