# Public Contact Form (`/contact` → `POST /api/contact`)

The public contact page posts to a **Next.js Route Handler** (not a backend
microservice) that validates, screens for abuse, and delivers the message
through a provider-neutral email adapter. It is **OFF by default** and ships no
credentials.

## Request flow

```
/contact (marketing page)
  → ContactForm (react-hook-form + zod)
    → POST /api/contact  (Next Route Handler, Node runtime, force-dynamic)
      → processContactSubmission()
          1. zod validate (contactSchema)        → 400 invalid
          2. honeypot (`company` filled)          → 200 rejected (silent)
          3. timing trap (elapsedMs < 1500)       → 200 rejected (silent)
          4. rate limit (per client IP)           → 429 rate_limited (+Retry-After)
          5. resolve transport
               - disabled/unconfigured            → 200 accepted_not_configured
               - console                          → 200 delivered (logged, redacted)
               - smtp                             → 200 delivered (nodemailer 9.x)
```

nginx routes `/api/contact` to the frontend via the `location /` catch-all
(only `/api/v1/*` is proxied to backends), so no nginx change is required.

## Abuse & injection defences

| Threat                           | Defence                                       | Code                       |
| -------------------------------- | --------------------------------------------- | -------------------------- |
| Header injection (BCC via CRLF)  | Strip control chars from header-bound fields  | `sanitizeHeaderValue`      |
| HTML injection in the email body | Full HTML escape                              | `escapeHtml`               |
| Log forging                      | Strip newlines before logging                 | `sanitizeForLog`           |
| Bots                             | Honeypot `company` field + submit-timing trap | `processContactSubmission` |
| Flooding                         | In-memory per-IP sliding-window rate limit    | `rate-limiter.ts`          |
| Oversized input                  | `.max()` on every zod field                   | `contact.schema.ts`        |
| Credential leakage               | All config server-only (no `NEXT_PUBLIC_`)    | `contact-config.ts`        |

nodemailer is pinned to **9.x** — the 7.x line carried high-severity
CRLF/command-injection advisories.

## Enabling real delivery

Set these (server-only) env vars and recreate the frontend container so the new
`env_file` values are loaded (`docker restart` does NOT reload env):

```bash
CONTACT_EMAIL_ENABLED=true
CONTACT_EMAIL_PROVIDER=smtp          # or `console` for a redacted-log dev stub
CONTACT_EMAIL_FROM=no-reply@yourdomain.com
CONTACT_EMAIL_TO=support@yourdomain.com
CONTACT_SMTP_HOST=smtp.yourprovider.com
CONTACT_SMTP_PORT=587
CONTACT_SMTP_SECURE=false            # true for implicit TLS on 465
CONTACT_SMTP_USER=...
CONTACT_SMTP_PASS=...
# Optional tuning:
CONTACT_RATE_LIMIT_MAX=3
CONTACT_RATE_LIMIT_WINDOW_MS=3600000
```

If `PROVIDER=smtp` but any of host/user/pass is missing, the transport resolves
to `null` and the route returns `accepted_not_configured` (never a 500).

## Response codes (`{ ok, code }`)

| code                      | HTTP | Meaning                                      |
| ------------------------- | ---- | -------------------------------------------- |
| `delivered`               | 200  | Sent via the configured transport            |
| `accepted_not_configured` | 200  | Valid + accepted, delivery disabled          |
| `rejected`                | 200  | Honeypot/timing trap (silent to bots)        |
| `invalid`                 | 400  | Failed validation                            |
| `rate_limited`            | 429  | Over the per-IP limit (see `Retry-After`)    |
| `error`                   | 500  | Transport threw (details logged, not leaked) |

## Tests

`src/lib/contact/__tests__/*` (sanitize, rate-limiter, message-builder,
process-submission), `src/lib/validation/__tests__/contact.schema.test.ts`,
`src/components/marketing/contact/__tests__/contact-form.test.tsx`.
