---
name: change-the-product-positioning
summary: Change ClawAI's slogan, description, pillars or flagship list — one canonical home, every claim traced to wired code, and the fan-out to README, wiki, routers, context and memory in the same batch.
task_keywords:
  [
    positioning,
    repositioning,
    slogan,
    tagline,
    product description,
    flagship features,
    feature list,
    readme features,
    product vision,
    value proposition,
  ]
applies_to: []
required_rules:
  [33-knowledge-compounding-and-context-velocity, 38-adsense-eligibility-and-low-value-content]
required_context: [architecture-map]
affected_workspaces: []
required_tests: [knowledge-coverage, knowledge-verify]
required_docs:
  [docs/01-executive-context/product-vision.md, docs/02-business-product/flagship-features.md]
validation_lane: npm run knowledge:build && npm run knowledge:coverage && npm run knowledge:verify && npm run audit:check
---

# Skill: Change the product positioning

The positioning is a fact with **one** home. Everything else links to it. The last
time it drifted (2026-09-26, [DRIFT-001](../docs/02-business-product/drift-log.md)),
the README, the vision, the routers and the bootstrap each carried their own
three-month-old copy, and an agent asked "what is ClawAI?" answered from the
oldest one.

## When to use

- The owner changes the slogan, the one-paragraph description, the pillars, or
  which features are flagships.
- A feature ships that deserves a flagship row, or a flagship is removed.

## When NOT to use

- Wording on a single marketing page — that is
  [`publish-a-public-marketing-page.md`](publish-a-public-marketing-page.md).
- Prices, plan limits or credit terms — those live in
  [`docs/business/`](../docs/business/README.md) and need the business owner.

## The homes

| Fact                                     | Canonical home                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Slogan, description, pillars, non-goals  | [`docs/01-executive-context/product-vision.md`](../docs/01-executive-context/product-vision.md)             |
| Flagships, each with evidence and status | [`docs/02-business-product/flagship-features.md`](../docs/02-business-product/flagship-features.md)         |
| Why the positioning is what it is        | the newest positioning ADR ([ADR-126](../docs/13-adr/adr-126-every-ai-one-workspace-positioning.md))        |
| That it changed                          | [`docs/02-business-product/drift-log.md`](../docs/02-business-product/drift-log.md)                         |
| What the positioning requires            | [`docs/02-business-product/requirements-register.md`](../docs/02-business-product/requirements-register.md) |

## Procedure

1. **Audit before you write.** For every feature you will name, find the wired
   code: the manager or service that runs it **and** its caller. A method with no
   caller is scaffolding. Record status VERIFIED / PARTIAL / GAP and one evidence
   path per row in the flagship catalog. Commit subjects are leads, not evidence.
2. **Write the canonical homes first**: vision, flagship catalog, ADR (new one
   when the direction changes; addendum when it only widens), drift entry,
   requirement rows.
3. **Fan out — link, do not copy.** Root `README.md` (slogan, description,
   flagship summary linking to the catalog), `CLAUDE.md` Identity (one line),
   every router (`AGENTS.md`, `CODEX.md`, `cursor.md`, `GEMINI.md`, `KIMI.md`,
   `GLM.md`, `QWEN.md`, `DEEPSEEK.md`, `MISTRAL.md`, `.cursorrules`),
   `context/architecture-map.md`, `tools/knowledge/render-bootstrap.mjs` (then
   `npm run knowledge:build` regenerates `.ai/BOOTSTRAP.md`), the wiki mirrors
   (`wiki/Product-Vision.md`, `wiki/Flagship-Features.md`, `wiki/Home.md`,
   `wiki/_Sidebar.md`, `wiki/Documentation-Index.md`, `wiki/ADR-Index.md`),
   `docs/13-adr/adr-index.md`, `docs/CHANGELOG.md`.
4. **Honest gaps.** A pillar whose features are partly missing says so in the
   catalog's gap table. Never promise SSO, seats, shared billing or anything else
   the audit could not find.
5. **Do not touch numbers.** Prices and allowances are quoted only by linking
   `docs/business/`.
6. **Frontend copy is its own change** under the marketing skill and 13-locale
   i18n; the docs change does not edit `apps/claw-frontend`.
7. Gate: the `validation_lane` above, plus `npm run knowledge:test` when a
   `tools/` file changed.

## Pitfalls

- `grep "one subscription"` finds only frontend copy; the stale positioning in
  docs reads "local-first AI orchestration platform" — search both.
- `.ai/BOOTSTRAP.md` is generated. Edit the renderer, not the file.
- Wiki links are `[[Text|Page-Name]]`; a pipe inside a table row must be `\|`
  (`tools/__tests__/wiki-links-resolve.test.mjs`).
