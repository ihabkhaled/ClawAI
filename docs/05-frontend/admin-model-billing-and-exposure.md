# Admin model billing badge and the Model exposure panel

Two admin surfaces show whether a model is a **Credit** model (paid from the
user's credit wallet) or **Included** (not metered):

- **Model Prices** — `/admin/smart-router/model-costs`: a Billing column, an
  All / Credit / Included filter with counts, help text, and a per-row link to
  the connector that decides it.
- **Model exposure** — `/connectors/[connectorId]/models` (and the same section
  embedded at the bottom of the connector detail page): a badge on every model.

## Where "Credit" comes from

Billing is decided **per provider, not per model** (ADR-082). The badge copies
that rule exactly, so it cannot disagree with what the wallet is charged:

1. A local provider (`PAYG_EXEMPT_PROVIDERS`: Ollama, llama.cpp, local speech)
   is never metered → **Included**.
2. Otherwise the connector policy decides: a provider is **Credit** when ANY
   **enabled** connector for it has `isPayAsYouGo` ("Credit connector" switch).
   This mirrors connector-service `rollUpPaygPolicy`.
3. A provider with no connector row falls back to `PAYG_DEFAULT_PROVIDERS`,
   the same fallback auth-service `isMeteredProvider` uses.

Code: `src/utilities/model-billing.utility.ts` (pure, unit-tested). Data:
`useProviderCreditPolicy` reads the same `GET /connectors` the Connectors page
uses, through `fetchAllConnectorsForCreditPolicy`, which pages at the API's
100-row maximum (the default page is 20, and a single call silently dropped
connectors from the roll-up). The query key sits under
`queryKeys.connectors.lists()`, so toggling the switch refreshes every badge.

There is **no per-model credit flag**, on purpose: billing would ignore it. To
change a model's billing, change its provider's connector switch. No backend
change was needed; a server-joined field on `/router-models/costs` is only
worth adding if the 60 s auth-service policy cache must be reflected exactly.

## Responsive layout (both pages)

- Card/table switch is the `touch:` variant, the same as `ResponsiveTable`:
  cards on a phone and on a tablet in either orientation, a table on a mouse.
- Long lists render 50 rows at a time with "Show more" (`useIncrementalList`).
- On touch, filters move into a bottom sheet; the Model Prices filter bar and
  the exposure bulk-action bar stay sticky while scrolling.
- Both pages sit in a `max-w-screen-2xl` container, so a 2560px screen does not
  stretch rows.
- Exposure table: own scroll region with a sticky header, `text-start` headers
  (RTL-safe), select-all checkbox in the header, selected count, per-row menu
  (Expose / Unexpose with a confirm step), localized "Last seen", translated
  lifecycle, skeleton loading, and empty / no-match states.

## Shared fix

`DataTable` used to pass ResponsiveTable only the card-body columns, so the
mobile-title column (the Model name on Model Prices) disappeared from the
desktop table in every DataTable consumer. `ResponsiveTable` now takes
`tableColumns` (all columns) separately from `columns` (card body). Cards are
`position: relative`, so `sr-only` spans no longer stretch the document.
