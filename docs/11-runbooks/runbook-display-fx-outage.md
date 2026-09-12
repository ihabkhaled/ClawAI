# Runbook — display FX or geolocation is misbehaving

Scope: **localized price DISPLAY only**. Nothing in this runbook can change what
a customer is charged. If a CHARGE is wrong, this is the wrong document — go to
[`runbook-billing-reconciliation.md`](runbook-billing-reconciliation.md).

Decision: [ADR-097](../13-adr/adr-097-display-fx-separate-from-settlement-fx.md) ·
Rule: [`rules/45-display-currency-versus-settlement-currency.md`](../../rules/45-display-currency-versus-settlement-currency.md)

## First, decide whether anything is actually broken

Localized prices vanishing and every price showing USD is the system working.
Display FX fails open by design. Check in this order:

1. Is canonical pricing healthy? `curl -sk https://claw.local/api/pricing | head`
   If that is broken, the problem is auth-service's catalog, not FX.
2. Is checkout working? Display FX cannot block it. If checkout is down, this
   runbook is not the cause.
3. Only then, is the display context resolving?

```bash
curl -sk "https://claw.local/api/v1/billing/display-currency"
curl -sk "https://claw.local/api/v1/billing/display-currency?currency=EGP"
```

A response with `"currencyCode":"USD"` and `"fx":null` means the fallback worked.

## Symptom: everyone sees USD

Expected when both upstreams are unreachable. Confirm which:

```bash
curl -s "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EGP"
curl -s "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json" | head -c 200
```

Then check the service saw the same thing:

```bash
docker logs claw-payment-service --since 15m | grep -i "display-fx\|Frankfurter\|Fawaz"
```

No action is required. The site is correct, just not localized. If it persists
beyond an hour, the providers are down together, which is unusual enough to be
worth checking whether egress from the container is blocked.

## Symptom: a price looks absurd

A rate can be wrong without being insane — the sanity bounds reject zero,
negative and impossible values, deliberately not "suspiciously large", because a
narrow percentage cap rejects genuine devaluations exactly when they matter.

1. Read the cached rate:
   `docker exec claw-redis redis-cli GET "display-fx:rate:EGP"`
2. Compare with both upstreams by hand.
3. If ClawAI's number is wrong, drop the cache entry:
   `docker exec claw-redis redis-cli DEL "display-fx:rate:EGP"`
4. If the UPSTREAM is wrong, turn the feature off rather than fight it:
   set `DISPLAY_FX_ENABLED=false` in `.env`, then
   `./scripts/claw.sh service:recreate payment-service`.

**Recreate, not rebuild, and not `up -d --build`.** These are runtime env vars;
only a recreate re-reads `.env`.

Never respond to a bad rate by editing a plan price or an invoice. Canonical
prices and issued invoices are untouched by this subsystem and correcting one to
compensate for a display bug creates a real financial error out of a cosmetic one.

## Symptom: wrong country detected

Geolocation is convenience data. A VPN, a corporate proxy or a mobile carrier
routing through another country will all produce a "wrong" answer that is not a
bug. The user's own selection always wins.

To stop detecting entirely while keeping manual selection and USD working:
`DISPLAY_FX_GEO_ENABLED=false`, then recreate payment-service.

Check what nginx actually passed:

```bash
docker logs claw-nginx --since 10m | tail -30
```

Only `X-Real-IP` is trusted, and nginx overwrites it with the real socket
address. `CF-IPCountry`, `CF-Connecting-IP` and `True-Client-IP` are blanked at
the proxy. If someone reports "I can set my country with a header", verify the
blanking survived a config change:

```bash
docker exec claw-nginx grep -n "CF-IPCountry" /etc/nginx/claw/locations.conf
```

nginx bind-mounts this file by inode. A `git pull` gives it a NEW inode the
running container cannot see, so a reload silently serves the old config —
**restart the container, do not reload it.**

## Symptom: the free APIs are rate-limiting ClawAI

Check that single-flight is working. It should be one upstream call per currency
per 30 minutes, not one per visitor:

```bash
docker exec claw-redis redis-cli --scan --pattern "display-fx:*" | head -20
docker exec claw-redis redis-cli TTL "display-fx:rate:EGP"
```

If keys are missing entirely, Redis is down. That degrades to one upstream call
per request, which is exactly the shape that gets an origin blocked — fix Redis
or turn the feature off while you do.

## Rolling back

```bash
# in .env
DISPLAY_FX_ENABLED=false
./scripts/claw.sh service:recreate payment-service
```

Every price returns to canonical USD. No data migration, no invoice change, no
wallet change — display FX persists nothing. The frontend's own flag can be used
the same way if only the UI needs to stop.

## What this subsystem can never cause

Stated so an incident does not go looking here:

- a wrong charge, a wrong refund or a wrong invoice — those come from
  `modules/fx` and the gateways, never from `modules/display-fx`;
- a changed wallet balance — the wallet is micro-USD and switching display
  currency writes nothing;
- a blocked checkout — display FX has no path into checkout creation.
