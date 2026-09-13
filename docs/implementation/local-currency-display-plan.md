# Local-Currency Display — Implementation Plan

Status: shipped (batches 1-7) · verified live 2026-09-13 · Owner: billing/frontend · Source pack: `clawai-local-currency-prompt-pack`

Verification: [`local-currency-display-verification.md`](local-currency-display-verification.md)

Canonical rule: [`rules/45-display-currency-versus-settlement-currency.md`](../../rules/45-display-currency-versus-settlement-currency.md) ·
Decision: [ADR-097](../13-adr/adr-097-display-fx-separate-from-settlement-fx.md)

## The central invariant

Three amounts exist and are never merged:

| Concept          | Authority                             | Currency               | Mutable                 |
| ---------------- | ------------------------------------- | ---------------------- | ----------------------- |
| CANONICAL price  | `PlanPriceVersion` row                | USD                    | immutable version       |
| DISPLAY price    | display-FX + commercial rounding      | user's chosen/detected | recomputed every render |
| SETTLEMENT price | `FxQuote` bound to a checkout session | gateway's currency     | frozen per session      |

A DISPLAY amount must never reach a gateway adapter. Enforced by type
(`LocalizedMoneyView` carries no field a gateway call accepts) and by test.

## Audit: claim vs code (before any change)

| Pack claim                              | Code reality                                                                                                                                                                  | Status                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| payment-service has an FX module        | `apps/claw-payment-service/src/modules/fx/` — `FxService`, `FxQuoteRepository`, persisted quote, safety margin, TTL                                                           | present and wired                           |
| scaled-integer FX utilities exist       | `packages/shared-utilities/src/money/fx.utility.ts` — `parseRateToScaled`, `convertMinorUnits`, `applySafetyMarginToRate`, `FX_RATE_SCALE = 1e7`                              | present and wired                           |
| Paymob settles EGP, PayPal settles base | `FxService.fallbackRate` only knows EGP; settlement resolver maps gateway → currency                                                                                          | present and wired                           |
| integer minor units, no floats          | `money.utility.ts` — `assertIntegerMinor`, `roundHalfUpDivide`, `parseMajorToMinor`                                                                                           | present and wired                           |
| broad currency support exists           | `SUPPORTED_BILLING_CURRENCIES` = **USD, EGP, EUR, GBP only**, and `convertMinorUnits` asserts against it                                                                      | **conflicting** — see deviation D1          |
| public pricing flows catalog → FE       | `auth /api/v1/internal/plans/catalog` → `fetchPublicPricingCatalog()` → `/api/pricing` (`no-store`) → plan cards                                                              | present and wired                           |
| no hardcoded FE price fallback          | `fetchPublicPricingCatalog` returns `null`; route answers 503                                                                                                                 | present and wired                           |
| one money formatter                     | **four**: `formatMinorAmount` (billing/admin), `formatMicroUsd` (wallet/usage), `formatPlanPrice` (marketing), `formatPublicPlanUsd` (launch)                                 | partial — four chokepoints, no `$` literals |
| user preferences exist                  | `languagePreference`, `appearancePreference` only                                                                                                                             | missing currency fields                     |
| trusted edge country header             | **no Cloudflare.** nginx terminates TLS directly; `locations.conf` sets `X-Forwarded-For $proxy_add_x_forwarded_for` (appends client value) and does not strip `CF-IPCountry` | **missing + security gap** — see D2         |
| FX display cache                        | none. Settlement cache is a Postgres `FxQuote` row                                                                                                                            | missing                                     |
| feature-flag home                       | `SystemSetting` model + admin controller in auth-service                                                                                                                      | present and wired                           |
| country → currency map                  | none anywhere                                                                                                                                                                 | missing                                     |
| commercial rounding                     | none                                                                                                                                                                          | missing                                     |

## Deviations from the pack (policy outranks the pack)

**D1 — display currencies get their own allowlist.**
The pack asks for broad currency support. `SUPPORTED_BILLING_CURRENCIES` is the set
ClawAI can _charge_ in; widening it would silently let checkout accept AED. A new
`SUPPORTED_DISPLAY_CURRENCIES` is introduced instead, and display conversion uses a
display-only converter that never calls `assertSupportedCurrency`.
`DISPLAY_SUPPORTED ⊃ BILLING_SUPPORTED` is asserted by test.

**D2a — the browser time zone is a required fallback, not an optional one.**
The pack lists a locale/timezone heuristic as a weak last resort. On any
deployment where nginx sees a private address — local installs, corporate NATs,
container networks — IP geolocation cannot answer at all, so that "optional"
signal is the only thing standing between AUTO and a permanent USD. It ships,
mapped server-side through one `TIMEZONE_TO_COUNTRY` table, consulted last.

**D2 — `CF-IPCountry` is not trusted, and nginx is hardened.**
The pack prefers `CF-IPCountry`. The audit shows ClawAI is not behind Cloudflare
and nginx does not strip client headers, so that header is attacker-controlled
today. Country resolution trusts only `X-Real-IP`, which nginx overwrites with
`$remote_addr`. `locations.conf` additionally blanks client-supplied
`CF-IPCountry`, `True-Client-IP` and `X-Real-IP`. CF support is implemented but
gated off behind a `SystemSetting` for a future Cloudflare move.

**D3 — provider URLs are constants; kill switches are env, not `SystemSetting`.**
Repo preference is DB-level config over new env vars. Two exceptions apply here.
Provider base URLs must not be settable at all — `SECURITY §5` forbids a
user-editable FX URL, because that is an SSRF primitive — so they are constants
in `shared-constants`. The three kill switches stay in payment-service env
because they are the rollback lever: a switch that needs a database read to be
honoured cannot be used when the database or the cross-service hop is the
problem. They are `z.enum(['true','false'])`, not `z.coerce.boolean()`, which
turns the string `"false"` into `true` and would leave a disabled feature on.

**D4 — no new service.** A dedicated `claw-fx-service` would trigger the whole
18-item infra checklist for one HTTP call. Display FX goes in payment-service,
which already owns FX and already has `ioredis`.

## Batches

Each batch: scoped gates once at the end → commit → push before the next.

| #   | Scope                                                                                                                                                                | Knowledge delta                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| B1  | shared foundations: display currency metadata, country→currency map, commercial rounding, display-FX conversion, shared types/enums                                  | ADR-097, rule 45, this plan                                    |
| B2  | payment-service `display-fx` module: Frankfurter + fawaz adapters, Redis cache + single-flight, sanity checks, geo resolver, public endpoint; nginx header hardening | service guide, runbook, context maps, env/compose/CI checklist |
| B3  | auth-service currency preference (AUTO/MANUAL + country + currency), migration, system-setting flags                                                                 | service guide, permission/env maps                             |
| B4  | frontend display-currency context, selector, anonymous cookie, SSR-safe marketing surfaces, i18n ×13                                                                 | skill: add a localized money surface                           |
| B5  | billing portal: wallet, credit packages, ledger, usage, proration, invoices list                                                                                     | skill update                                                   |
| B6  | checkout dual display (estimate vs authoritative charge), refunds, admin secondary display                                                                           | checkout docs                                                  |
| B7  | E2E, security/spoof/SEO/cache tests, live verification, runbooks                                                                                                     | runbooks, release notes                                        |

## Out of scope (explicit)

- Local **settlement**: PayPal keeps charging the base currency, Paymob keeps EGP.
- Regional / purchasing-power pricing. No per-country `PlanPriceVersion`.
- Historical FX snapshots for past usage. Today's rate labelled as a current estimate.
- Localized amounts inside transactional emails and invoice PDFs.
- Self-hosting Frankfurter (documented as an escape hatch only).
- Psychological `.99` endings — the product asked for conversion, not price optimization.
