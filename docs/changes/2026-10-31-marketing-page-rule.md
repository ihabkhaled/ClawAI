# Every flagship feature ships a public marketing page

A new flagship, core feature, big feature or product introduction must ship its public marketing page in the same change
([ADR-208](../13-adr/adr-208-a-flagship-feature-is-not-shipped-without-its-marketing-page.md),
[rule 66](../../rules/66-every-flagship-feature-ships-a-public-marketing-page.md)).

- New rule 66 and skill [`ship-a-feature-marketing-page`](../../skills/ship-a-feature-marketing-page.md): route, registries (slug, SEO copy,
  content registry, `llms.txt`, sitemap), footer and internal links, metadata and JSON-LD, hero or demo video, real screenshots with alt text
  and dimensions, 13 locales, RTL, Lighthouse, AdSense, QA checklist. The skill lists the exact files to touch.
- Definition of done now carries the line: `rules/01-planning-rules.md`, `skills/03-feature-scaffold.md`, `QA-WORKFLOW.md`.
- `docs/02-business-product/flagship-features.md` states that a flagship row needs its page.
- Open: a check that a flagship-list entry has a `PUBLISHED` registry slug and a footer path (tooling owner). No code or page changed in
  this batch; the rule applies to the next flagship.

knowledge delta: this note, ADR-208, rules/66, the skill, the three definition-of-done lines.
