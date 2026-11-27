# ADR-222 — Sign-up abuse defences and internal surfaces

- **Status:** Accepted
- **Date:** 2026-11-27
- **Deciders:** owner (decisions below), lead agent
- **Context links:** [incident report](../security/incident-2026-11-27-open-ports-and-signup-farm.md),
  [rules/68](../../rules/68-internal-surfaces-stay-internal.md), [rules/58](../../rules/58-auth-route-rate-limits.md),
  [host runbook](../11-runbooks/runbook-production-host-hardening.md)

## Context

On 2026-11-24/25 a bot farm created 113 accounts on disposable email domains (euploading.com 90, uberip.com,
guerrillamail, mailinator, …) by posting straight to `POST /api/v1/auth/register` with curl, python-requests and a
fixed Chrome-130 user agent, from ~41 residential addresses a day in 21 countries. Every account got the free trial.
Per-address limits (5 sign-ups / hour / IP) did not help against rotating addresses, and nothing tied accounts to one
device. The same review found every internal port published to the internet (an attacker abused the open Redis) and
internal service routes that trusted any caller on the Docker network.

## Decision (owner, 2026-11-27)

1. **Three layered bot checks on sign-up** (and on sign-in after 5 failures for an address or email in 15 min):
   a built-in proof-of-work challenge (always on; HMAC-signed, single use, ~18 leading zero bits), plus Cloudflare
   Turnstile and Google reCAPTCHA v3 whenever their keys are configured (admin `security.*` settings, or the
   `TURNSTILE_*` / `RECAPTCHA_*` server environment variables; a non-empty admin setting wins). A provider that is
   unreachable fails open only when the proof-of-work passed, and is logged.
2. **Disposable email is refused**: a bundled, maintained disposable-domain list (subdomains included) plus an MX check
   (no MX and no A/AAAA → refused; a DNS timeout allows). Admins add blocked or allowed domains.
3. **One free trial per device**: a peppered hash of a browser fingerprint and a stored device id is recorded at
   sign-up and sign-in (`user_devices`). An account whose device, device id or sign-up network (/24, IPv6 /48 with 3+
   trials in 24 h) already redeemed a trial starts with its trial already over; a sign-up without device data gets no
   trial. Admins see linked accounts per user.
4. **Platform-wide sign-up velocity limit** (default 30 / 10 min, 3 per device per day) with `Retry-After`.
5. **The 113 farm accounts are banned** (reversible, reason recorded) and their sessions closed.
6. **Internal surfaces stay internal** (rules/68): only nginx 80/443 are public, every other production port binds to
   loopback and is dropped by `DOCKER-USER` on the host, Redis gets `requirepass`, and every internal controller requires
   the service token at class level.
7. **Edge budgets and auto-bans**: nginx per-address limits on register, login, bot-check and client logs, 100
   concurrent connections per address; fail2ban bans SSH brute force, secret/exploit scanners, 429 floods and sign-in
   failure storms in `DOCKER-USER`.

## Alternatives considered

- **Only big email providers** (Gmail, Outlook, …): strongest, but refuses real company and university addresses.
  Rejected by the owner in favour of a disposable blocklist.
- **Hard cap of accounts per device**: refuses shared family/office machines; the trial is what was abused, so the
  limit applies to the trial.
- **One captcha only**: the owner asked for all three; proof-of-work keeps working with no third party and no keys.
- **Third-party fingerprint library**: not needed; a small in-house signal hash plus a stored id is enough to link
  accounts and keeps the bundle and privacy surface small.

## Consequences

- Sign-up costs a real browser about a second of proof-of-work; scripts must solve it per attempt and per address.
- A person on a shared device gets one trial; support can reset via admin.
- Fingerprints are stored only as peppered hashes; logs carry the email domain, never the full email.
- Turnstile and reCAPTCHA load third-party scripts on sign-up and sign-in only (CSP widened for those origins).
- Database containers take the loopback binding only when recreated (the deploy never recreates databases); the
  host firewall enforces it until then. The Redis password needs one short coordinated restart (runbook §4).

## What would make this stale

A change to the free-trial model, a new public port or service, a move behind a CDN (client address source changes),
or a captcha provider change.
