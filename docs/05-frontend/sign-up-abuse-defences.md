# Sign-up abuse defences (frontend)

Web-client half of [ADR-222](../13-adr/adr-222-sign-up-abuse-defences-and-internal-surfaces.md)
(security incident 2026-11-27: 113 throwaway accounts posted straight to the sign-up API). The
server is the authority for every rule below; the client's job is to send the checks, send the
device, and explain each refusal in the reader's language.

## What the sign-up and sign-in forms send

| Body field | Sign-up                                   | Sign-in                                                   |
| ---------- | ----------------------------------------- | --------------------------------------------------------- |
| `device`   | always (when the browser can hash)        | always (when the browser can hash)                        |
| `botCheck` | always: proof of work + configured tokens | only after the server answered **428 BOT_CHECK_REQUIRED** |

- **Proof of work** — `POST /api/v1/auth/bot-check/challenge`, then find a decimal `nonce` with
  `SHA-256(salt + nonce)` starting with `difficulty` zero **bits**. Solved by the plain-JS worker
  `apps/claw-frontend/public/workers/pow-solver.js` (crypto.subtle, 256 hashes per round, gives up after
  2^28 attempts); `lib/bot-check/pow-solver.ts` is its client and its main-thread fallback. Keep the two
  loops identical — `pow-solver.test.ts` runs the real worker file and compares nonces.
- **Turnstile** (explicit render) and **reCAPTCHA v3** load only when
  `GET /api/v1/auth/bot-check/config` returns their site key, and only on these two pages
  (`lib/bot-check/turnstile.ts`, `recaptcha.ts`, `script-loader.ts`; never the root layout, rules/47).
- **Sign-up is eager**: the proof of work, the widget and the reCAPTCHA script start when the form mounts, so
  the answer is ready by the time the person presses the button. Typing is never blocked; a small
  "Checking your browser…" status line shows while the check runs, and the button reads the same only
  if the click is still waiting on it.
- **Sign-in is lazy**: nothing runs and no third-party script loads until a 428. Then
  `authService.loginWithBotCheck` collects the checks and retries **once**; every later attempt from that
  form sends them up front. A second 428 reaches the form as "We couldn't check your browser".
- Every token is single use: `collect()` consumes the prepared set and a checking form starts the next one.
- Each check is best effort: a part that cannot run is left out and the server answers
  BOT_CHECK_REQUIRED / BOT_CHECK_FAILED, which the form translates.

Code: `services/auth/bot-check-session.service.ts` (framework-free session, injected dependencies),
`services/auth/bot-check.service.ts` (real wiring), `hooks/auth/use-bot-check.ts` (one session per mounted
form, created in the effect so the development double-mount disposes cleanly),
`components/auth/bot-check-notice.tsx` (widget container + status line).

## Device fingerprint

`lib/bot-check/device-fingerprint.ts`, no third-party library: SHA-256 over timezone, languages,
platform, screen size and colour depth, hardware concurrency, device memory, WebGL vendor/renderer,
touch support and a canvas-drawing hash → 64-hex `fingerprint`; plus a random UUID `deviceId` kept in
`localStorage` (`claw.device-id`, try/catch, per-page fallback). The signals ride along as
`device.signals`. Neither value is secret; the server peppers and hashes both. No `crypto.subtle`
(insecure context) means no `device` — the request still goes out and the server grants no trial.

## Refusal copy (`auth.botCheck.*`, all 13 locales)

| Code (status)                    | Where it shows                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| BOT_CHECK_REQUIRED (428)         | form alert "We couldn't check your browser" (sign-in: after the one retry)           |
| BOT_CHECK_FAILED (403)           | form alert "Your browser didn't pass the security check"                             |
| DISPOSABLE_EMAIL (400)           | on the email field; alert "Some details need fixing"                                 |
| EMAIL_DOMAIN_UNDELIVERABLE (400) | on the email field; alert "Some details need fixing"                                 |
| SIGNUP_TEMPORARILY_LIMITED (429) | alert "Sign-ups are paused", minutes from `Retry-After` (`resolveRetryAfterMessage`) |

SIGNUP_TEMPORARILY_LIMITED is matched by code before the bare-429 fallback: it is the platform pausing
sign-ups, not this person retrying. Toasts translate the same codes (`api-error-message.utility.ts`).
Copy lives in `lib/i18n/locales/anti-abuse-translations.ts`; `anti-abuse-refusals.test.ts` renders every
refusal in every locale.

## Admin

- **`/admin/security/sign-up`** ("Sign-up protection", sidebar `nav.adminSecuritySignup`). Reads
  `GET /api/v1/admin/settings` (route gated on `ADMIN_SYSTEM_VIEW`) and writes one
  `PUT /api/v1/admin/settings/:key` per changed key. Saving needs `ADMIN_CREDIT_MANAGE`, the permission
  the PUT enforces today; without it the form is read-only rather than a button that 403s.
  Keys: `security.turnstile.siteKey/secretKey`, `security.recaptcha.siteKey/secretKey/minScore`,
  `security.pow.difficulty` (12–24), `security.email.blockedDomains/allowedDomains` (comma lists,
  normalised lower-case and de-duplicated), `security.signup.maxPer10Min/maxPerDevicePerDay`.
- **Secrets are write-only.** The box is always empty; its placeholder says "Configured" when the server
  reports `configured: true`. An empty secret box is never sent; anything typed replaces the secret.
- **Linked accounts** — the user detail dialog (users table, eye icon) has a "Linked accounts" button that
  opens `UserLinkedAccountsDialog` → `GET /api/v1/admin/users/:id/linked-accounts` (`ADMIN_USERS_MANAGE`,
  same as the page). Each row: email, status, banned badge, registered date, reasons (same device, same
  device ID, same sign-up network). An unknown reason code is dropped, never shown raw.

## CSP

`lib/security/content-security-policy.ts` adds `https://challenges.cloudflare.com`,
`https://www.google.com/recaptcha/`, `https://www.gstatic.com/recaptcha/` to `script-src` (development,
and CSP2 browsers in production — CSP3 trusts the loader through `strict-dynamic`) and
`https://challenges.cloudflare.com`, `https://www.google.com/recaptcha/`, `https://recaptcha.google.com`
to `frame-src` in every environment. `connect-src` and `img-src` are not widened. The worker file is
same-origin, covered by `worker-src 'self'`. Guarded by `csp-bot-check.test.ts`.
