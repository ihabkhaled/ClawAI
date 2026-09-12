# Local-Currency Display — live verification

Rule: [`rules/44-live-verification-before-done.md`](../../rules/44-live-verification-before-done.md) ·
Plan: [`local-currency-display-plan.md`](local-currency-display-plan.md)

Run against the running stack at `https://claw.local` on 2026-09-13, after
recreating payment-service, auth-service and the frontend onto the new code.
Every figure below is observed output, not an expectation.

## Display FX, against the real upstreams

```text
GET /api/v1/billing/display-currency
  {"countryCode":null,"currencyCode":"USD","mode":"AUTO",
   "countrySource":"UNRESOLVED","fx":null}

GET /api/v1/billing/display-currency?currency=EUR
  "rateScaled":8626600,"asOf":"2026-09-11","source":"FRANKFURTER"

GET /api/v1/billing/display-currency?currency=EGP
  "rateScaled":513752406,"asOf":"2026-09-12","source":"FAWAZ_EXCHANGE_API"
```

The EUR rate matches `api.frankfurter.dev` exactly (0.86266). EGP came from the
fallback because Frankfurter answers `{"message":"not found"}` for it — it
covers ECB reference currencies only. **That is the failover working, not a
broken primary**, and it is worth writing down because the obvious reading of
"the fallback answered" is that something is wrong.

Second EUR call returned `"source":"CACHE"`.

## Security, live

```text
currency=BTC                -> USD, fx null
currency=ZZZ                -> USD, fx null
currency=../../etc/passwd   -> USD, fx null
currency=<300 chars>        -> USD, fx null

CF-IPCountry: EG + X-Forwarded-For: 41.33.10.5 + True-Client-IP: 41.33.10.5
  -> {"countryCode":null,"currencyCode":"USD","countrySource":"UNRESOLVED"}
```

Nothing unvalidated reaches a cache key, a provider URL or a country decision.
`nginx -T` on the running container confirms the loaded config blanks
`CF-IPCountry`, `CF-Connecting-IP` and `True-Client-IP` (2 matches). The service
refuses the header independently, so the spoof fails twice.

## The preference, live

```text
PATCH /users/me/preferences {"currencyPreferenceMode":"MANUAL",
                             "preferredCurrencyCode":"egp",
                             "preferredCountryCode":"eg"}
  -> {"currencyPreferenceMode":"MANUAL","preferredCurrencyCode":"EGP",
      "preferredCountryCode":"EG"}          # normalized on the way in
```

Migration applied; `\d users` shows `currency_preference_mode` (NOT NULL,
default AUTO), `preferred_country_code VARCHAR(2)`, `preferred_currency_code
VARCHAR(3)`.

**This is where verification earned its keep.** `GET /auth/me` — the only
endpoint the client reads a profile from — did not return the new fields. The
preference was stored, echoed back by the endpoint that wrote it, and invisible
to the UI. Both halves were individually correct and no unit test spans the gap
between two endpoints. Fixed in `auth.manager.getProfile`.

## The pricing page, in the DOM

Served HTML, first paint, no hydration needed:

| Canonical | Cookie `EGP`    | Cookie `EUR` |
| --------- | --------------- | ------------ |
| $0.00     | ≈ EGP 0.00      | ≈ €0.00      |
| $1.00     | ≈ EGP 51.00     | ≈ €0.86      |
| $5.00     | ≈ EGP 255.00    | ≈ €4.31      |
| $10.00    | ≈ EGP 515.00    | —            |
| $20.00    | ≈ EGP 1,030.00  | ≈ €17.00     |
| $50.00    | ≈ EGP 2,570.00  | —            |
| $200.00   | ≈ EGP 10,300.00 | —            |

Commercial rounding is visible and behaving: EGP 515 rather than 513.75 (nearest
5 in the hundreds), 1,030 and 10,300 (nearest 10), while €4.31 keeps both
decimals under ten. The free plan stays exactly zero in every currency — the one
case where rounding would invent money out of nothing.

No cookie, an `AUTO` cookie, and a tampered `BTC` cookie all render plain
`$1.00` with no tilde and no layout damage.

## Deployment note that cost the most time

Three containers served stale shared-package `dist/` and had to have
`packages/shared-{constants,types,utilities}/src` copied in and rebuilt before
they ran the new code. The frontend failed loudly — `SUPPORTED_DISPLAY_CURRENCIES
was not found in module packages/shared-constants/dist/index.js`, a 500 on
`/pricing` — which is the good case. payment-service and auth-service failed as
TypeScript errors at boot.

`claw-auth-service` was **already unhealthy before this work**, for the same
reason and on unrelated code (`Cannot find module '../copy'` in the email
renderer). The same refresh fixed it.

## Not verified here

- Paymob's real EGP settlement total, which needs a live gateway session.
- A genuine foreign IP. Local dev traffic is private-range, so `country.is` is
  correctly never called and geolocation resolves UNRESOLVED → USD.
- Lighthouse and CodeQL, which run in CI on the pushed branch.
