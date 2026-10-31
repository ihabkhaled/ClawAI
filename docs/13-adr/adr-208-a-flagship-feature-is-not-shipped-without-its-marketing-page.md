# ADR-208: A flagship feature is not shipped without its public marketing page

**Status:** Accepted

**Date:** 2026-10-31

Builds on [ADR-084](adr-084-seo-cluster-fan-out-shape.md) (the registry fan-out) and serves the positioning in [ADR-126](adr-126-every-ai-one-workspace-positioning.md). New rule: [rule 66](../../rules/66-every-flagship-feature-ships-a-public-marketing-page.md). Skill: [ship-a-feature-marketing-page](../../skills/ship-a-feature-marketing-page.md).

## Context

Marketing pages for flagships were written after the fact, in batches, and some shipped features had no page for weeks. The registry-driven discovery chain (sitemap, RSS, `robots`, `llms.txt`, IndexNow, the footer, Lighthouse coverage) already makes a page cheap to add and expensive to forget. The Threads page showed the full shape: real screenshots, a video section, thirteen locales, structured data, footer link. Nothing made that shape mandatory.

## Decision

Any new flagship, core feature, big feature or product introduction ships, in the same change, a public marketing page with: a crawlable route under `(marketing)`, registry entries (so the sitemap and `llms.txt` list it), footer and navigation links plus internal links from related pages, canonical, hreflang, Open Graph and honest JSON-LD, a hero or demo video and real screenshots with alt text and dimensions, full copy in all 13 locales, an RTL-safe layout, Lighthouse and AdSense budgets respected, and a marketing checklist in the QA evidence record. [Rule 66](../../rules/66-every-flagship-feature-ships-a-public-marketing-page.md) is the rule and the skill lists the exact files.

## Alternatives considered

- **Page in a follow-up.** Rejected: it is the status quo that failed.
- **A generic "coming soon" page.** Rejected: thin content hurts AdSense eligibility ([rule 38](../../rules/38-adsense-eligibility-and-low-value-content.md)) and promises what is not there.
- **Automatic page generation from the flagship list.** Deferred: the copy and media must be real; the registry fan-out already automates everything that can be.

## Consequences

- Feature work grows by one page, one video and a set of screenshots, and by thirteen locales of copy. That cost is accepted so features are discoverable on launch day.
- The definition of done for features ([rule 01](../../rules/01-planning-rules.md), [feature scaffold skill](../../skills/03-feature-scaffold.md), [QA workflow](../../QA-WORKFLOW.md)) gains one line.
- Enforcement is the existing coverage tests plus review. A check that a flagship-list entry has a `PUBLISHED` slug and a footer path is a follow-up for the tooling owner.
