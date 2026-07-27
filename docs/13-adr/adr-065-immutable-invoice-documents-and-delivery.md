# ADR-065: Immutable invoice documents and durable delivery

**Status**: Accepted
**Date**: 2026-07-27
**Deciders**: ClawAI core team
**Slice**: Subscription completion

## Context

Payment capture already issued an `Invoice` with immutable line snapshots, but
customers could neither render nor download it and no delivery intent survived a
process crash. Sending directly from the webhook handler would couple payment
activation to SMTP availability and could commit money without a reproducible
delivery record.

## Decision

- Invoice facts and lines become database-immutable after issue. Refund status
  and its monotonically increasing, bounded refunded total are the only lifecycle
  mutation. Corrections mint a compensating document; they never rewrite history.
- PDF generation accepts a deliberately customer-safe projection and is wrapped
  behind the payment service's invoice utility. Internal ids, gateway references,
  tokens and card data cannot enter the renderer's input.
- Invoice creation and its one-to-one `InvoiceDelivery` intent commit in the same
  database transaction. SMTP delivery runs later under the shared Redis-owned
  scheduled-job runner, with bounded exponential retry.
- Contact mail and invoices use the same SMTP adapter in
  `@claw/shared-utilities`. Attachments accept in-memory bytes only; file and URL
  access are disabled.
- Customer downloads use `GET /billing/invoices/:id/pdf`. The verified JWT owner
  is part of the database predicate, so absent and foreign ids return the same
  `INVOICE_NOT_FOUND` result.

SMTP is at-least-once. A provider can accept a message and lose the response,
making exact-once delivery impossible without provider-side idempotency. Every
attempt therefore uses the stable message id `invoice-<invoiceId>@claw.ai`;
operators should treat duplicate delivery as preferable to a missing invoice.

## Alternatives considered

- **Render or email synchronously in the payment webhook.** Rejected because an
  SMTP outage would block verified payment activation.
- **Store generated PDF bytes.** Rejected because immutable source facts already
  reproduce the document and stored binaries introduce retention and access
  surfaces.
- **Use hosted gateway invoice URLs.** Rejected because provider support is not
  symmetric and ownership would be delegated outside ClawAI.

## Consequences

- Customers can always download the same document even when mail is disabled.
- SMTP credentials remain server-only and one wrapper owns transport hardening.
- Delivery jobs can reach `FAILED` after the configured attempt ceiling and need
  operator attention.
- Historical rows created before this migration have no original delivery job;
  their PDFs remain available through the owned download endpoint.

## Validation

Migration trigger tests cover header/line immutability. Unit and contract tests
cover integer totals, safe PDF projection, durable delivery creation, retry
state, ownership-safe rendering, authenticated blob download and all supported
frontend locales.

## Rollback

Disable SMTP delivery while keeping the delivery rows and download route.
Dropping immutability triggers or delivery history is not a safe rollback because
it would make already-issued financial documents mutable or unauditable.
