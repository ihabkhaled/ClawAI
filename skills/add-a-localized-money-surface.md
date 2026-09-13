# Skill — add a localized money surface

Use when a screen must show an amount of money and you want it in the visitor's
currency. Takes about ten minutes. The whole job is calling two things and
resisting the urge to format the number yourself.

Rule: [`rules/45-display-currency-versus-settlement-currency.md`](../rules/45-display-currency-versus-settlement-currency.md) ·
Decision: [ADR-097](../docs/13-adr/adr-097-display-fx-separate-from-settlement-fx.md)

## Before you start: is this a price or a charge?

| The number is…                           | Then                                | Use          |
| ---------------------------------------- | ----------------------------------- | ------------ |
| a price someone is being SHOWN           | localize it                         | this skill   |
| an amount someone WILL BE or WAS charged | leave it exactly as the server said | nothing here |

An invoice total, a refund amount, a gateway charge and a wallet balance are
facts. You may show a current local equivalent BESIDE one, clearly secondary,
but never in place of it. If you are unsure which you have, it is a charge.

## The two calls

```tsx
const price = useLocalizedMoney(plan.amountMinor, plan.currency);

<span>{price.text}</span>;
{
  price.canonicalText === null ? null : (
    <span className="text-muted-foreground text-xs">
      {t('marketing.currency.convertedFrom').replace('{amount}', price.canonicalText)}
    </span>
  );
}
```

`price.text` is already `≈ EGP 515`, already commercially rounded, already in the
right decimal count for the currency, and already plain `$10.00` when no
conversion happened. `price.canonicalText` is null unless there is genuinely
something to disambiguate, so the second line can be written unconditionally.

For a usage or wallet figure, pass the other policy:

```tsx
const used = useLocalizedMoney(microUsdToMinor(cost), 'USD', DisplayRoundingPolicy.PRECISE_USAGE);
```

`PRECISE_USAGE` does not round. Use it for anything that is an ACCOUNT or a
PROMISE rather than a price: a ledger row, a wallet balance, a credit allowance.
A ledger showing $0.004 as "$0.00" tells someone they were charged nothing, and
a credit allowance rounded up advertises more than the plan actually grants —
the wallet then looks short. A price may round because a plan card promises
nobody an exact figure; these may not.

Micro-USD figures go through `microUsdToMinor` first — the converter works in
minor units, and a second hand-written `/ 10_000` is one copy too many of a
money conversion.

## The provider must be above you

`useLocalizedMoney` needs `DisplayCurrencyProvider` in the tree. The marketing
layout already mounts it with a server-resolved context. If your surface is in a
tree that does not, mount it the same way:

```tsx
const displayCurrency = await fetchDisplayCurrencyContext(await headers());
return <DisplayCurrencyProvider initialContext={displayCurrency}>…</DisplayCurrencyProvider>;
```

Resolve on the SERVER. Resolving after hydration is what makes `$10` visibly
flip to `≈ EGP 515` a moment later.

Outside a provider the hook returns canonical amounts instead of throwing, so a
component in a test or a not-yet-wired shell renders the real price rather than
crashing the tree.

## Things that look helpful and are not

**Formatting the number yourself.** `new Intl.NumberFormat(...)` in a component
is how the tilde ends up on the pricing page and missing from the checkout
summary, and how one screen rounds a step differently from another.

**Storing the converted amount.** Anywhere. In state that outlives a render, in
a query cache keyed without the currency, in a prop passed to something that
will send it somewhere. Display amounts are computed, never persisted.

**Widening `SUPPORTED_BILLING_CURRENCIES`** to make a currency work. That is the
set ClawAI can CHARGE in. You want `SUPPORTED_DISPLAY_CURRENCIES`.

**Sending `view.displayAmountMinor` to a server.** If you find yourself doing
this, stop and re-read the table at the top.

## Adding a currency

One line in `SUPPORTED_DISPLAY_CURRENCIES` with its REAL minor-unit exponent —
0 for JPY, 3 for KWD, and never assume 2. If a country should default to it, one
line in `COUNTRY_TO_DISPLAY_CURRENCY`. Both are tested; the test that every
mapped country points at a displayable currency will catch a half-done job.

## Checking it works

```bash
curl -sk "https://claw.local/api/v1/billing/display-currency?currency=EGP"
```

Then in the browser at https://claw.local — the service worker will re-serve
stale chunks after a rebuild, so unregister it and confirm the new code is in the
DOM before believing what you see.

Four things to look at: the price shows a tilde; the canonical figure is still
readable somewhere; switching to USD removes the tilde; and with
`DISPLAY_FX_ENABLED=false` plus a payment-service recreate, everything is
ordinary dollars with no broken layout.
