# ADR-126 — "Every AI, one workspace": ClawAI is positioned as a full AI workspace

## Status

Accepted — 2026-09-26. Owner decision. Supersedes the product positioning in the
pre-2026-09-26 [product vision](../01-executive-context/product-vision.md)
("local-first AI orchestration platform") and the marketing slogan
"Every Frontier AI Model, One Subscription".

## Context

Between 2026-08-25 and 2026-09-26 the product shipped far past chat: voice and
video notes, transcription, helper vision, files written by the AI (PDF, Word,
Excel, PowerPoint, Zip), archive expansion, narrated web research and crawling,
Compare plus nine orchestration labs, read-aloud, pay-as-you-go connector credit with
local-currency display, fifteen new provider presets, a status page with
Grafana and Prometheus, and multi-replica streaming. Each is traced to code in
the [flagship catalog](../02-business-product/flagship-features.md).

The public story had not moved. The slogan sold "one subscription" at the
moment the business was moving towards pay-as-you-go credit, the vision still
listed "does not browse the web" and "single-user only" as non-goals, and the
agent routers described an architecture, not a product. An agent asked "what is
ClawAI?" gave an answer three months out of date.

## Decision

1. **Slogan:** "Every AI, one workspace."
2. **Description:** "Every frontier AI model in one workspace that sees, hears,
   researches and builds. Pay as you go, bring your team, or run it on your own
   hardware."
3. **Four pillars**, in this order: the workspace (multimodal, files, research,
   labs), pay-as-you-go, teams and business customers, local-first and privacy.
4. **One canonical home** for the positioning:
   [`docs/01-executive-context/product-vision.md`](../01-executive-context/product-vision.md).
   The flagship list lives in
   [`docs/02-business-product/flagship-features.md`](../02-business-product/flagship-features.md).
   README, wiki, `CLAUDE.md` Identity and every agent router link to those two
   files instead of restating them.
5. **Every flagship claim is traceable** to shipped, wired code, with an
   evidence path in the flagship catalog. What is partial is labelled partial;
   what is not built is listed as a gap, never as a feature.

## Alternatives considered

- **Keep "Every Frontier AI Model, One Subscription".** Rejected: it frames the
  product as a model reseller and contradicts the pay-as-you-go focus.
- **"AI orchestration platform".** Rejected as the public line: it is accurate
  for engineers and meaningless to a buyer. It stays as the architectural
  description in [`context/architecture-map.md`](../../context/architecture-map.md).
- **Lead with local-first.** Rejected as the lead: most paying users run the
  hosted stack; local-first is the fourth pillar, a differentiator, not the pitch.

## Consequences

- **Teams claims are bounded by what exists.** Admin user management, plan
  grants, per-user usage, RBAC roles and a Team plan exist. A multi-member
  organisation account with shared billing and SSO does not (see the gaps in the
  flagship catalog and the [requirements register](../02-business-product/requirements-register.md)).
  Copy says "bring your team" and describes admin-managed users; it must not
  promise SSO, seats or shared org billing until they ship.
- **Prices do not change.** This is positioning only. Numbers stay in
  [`docs/business/`](../business/README.md) and the plan catalog.
- **Marketing copy in `apps/claw-frontend` is a separate change**, owned by a
  parallel batch; this ADR governs its direction, not its wording.
- The change is recorded in the [drift log](../02-business-product/drift-log.md).

## Revisit when

- A multi-member organisation account, shared billing or SSO ships — the teams
  pillar can then say more.
- The business stops leading with pay-as-you-go.
