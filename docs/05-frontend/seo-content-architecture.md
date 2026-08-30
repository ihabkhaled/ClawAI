# SEO content architecture — audit and plan

**Audited:** 2026-08-30 · **Site:** https://claw-ai.co ·
**Scope:** every public route under `app/(marketing)`, plus every discovery
document derived from the content registry.

Companion to [`multilingual-discovery.md`](multilingual-discovery.md), which
documents the mechanism. This document is the _content_ decision: what exists,
what is missing, what gets built, and what was deliberately refused.

---

## 1. What already exists, and is load-bearing

The discovery layer is finished and self-maintaining. **Do not rebuild any of
it, and do not hand-write anything it derives.**

`PUBLIC_CONTENT_DEFINITIONS` (`constants/content-registry.constants.ts`) is the
single authority. From one registry entry, a page automatically reaches:

| Surface                             | Route                                   | Derived how                                                     |
| ----------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| Sitemap index                       | `/sitemap.xml`                          | Chunked per locale, counts pages rather than assuming one chunk |
| Sitemap documents                   | `/sitemaps/{locale}/pages-N.xml`        | `getIndexablePagesForLocale`                                    |
| Global feed                         | `/rss.xml`                              | All 13 locales, one fixed URL, each item language-tagged        |
| Locale feed                         | `/feed.xml`, `/{locale}/feed.xml`       | Locale-negotiated                                               |
| Topic + chat feeds                  | `/feeds/topics.xml`, `/feeds/chats.xml` | `RssFeedKind`                                                   |
| Robots                              | `/robots.txt`                           | Named crawler groups, sitemap advertised                        |
| AI discovery                        | `/llms.txt`                             | Registry                                                        |
| Footer                              | `marketing-footer`                      | Published entries only                                          |
| Canonical + hreflang + OG + Twitter | every page                              | `buildRequestPublicPageMetadata`                                |
| Feed advertisement                  | `<link rel="alternate">`                | `alternates.types`, both locale and global                      |

Four tests fail the build if the chain breaks: `sitemap-coverage.test.ts`,
`lighthouse-coverage.test.ts`, `marketing-footer.test.tsx`,
`content-registry.utility.test.ts`. Lighthouse CI asserts **accessibility,
best-practices and SEO at `minScore: 1`** — a hard error, not a warning.

**Consequence for this work:** a new page is a registry entry plus content. It
is never a hand-written canonical, sitemap line, feed item or footer link.

### Existing public surface (28 pages × 13 locales)

| Group      | Paths                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Product    | `/`, `/about`, `/features`, `/how-it-works`, `/pricing`, `/use-cases`                           |
| Models     | `/supported-models`                                                                             |
| Coding     | `/coding-agent`, `/coding-agent/install`                                                        |
| Private AI | `/local-first-ai`, `/architecture`, `/security-and-privacy`                                     |
| Comparison | `/compare` + 9 rivals (chatgpt, claude, gemini, perplexity, copilot, kimi, qwen, glm, deepseek) |
| Support    | `/faq`, `/contact`                                                                              |
| Legal      | `/terms`, `/privacy`, `/cookies`, `/acceptable-use`                                             |
| Dynamic    | `/share/chat/[publicShareId]`                                                                   |

Locales: `en ar fr it de es ru pt hi ja th fa zh` — 13, two RTL (`ar`, `fa`).

---

## 2. Findings

### F1 — 15 PLANNED registry slugs were never built

`PLANNED_CONTENT_CONFIGS` declares `multi-provider-ai`, `model-routing`,
`advanced-orchestration`, `memory-and-context`, `rag-and-files`,
`workspace-connectors`, `desktop-agent`, `self-hosting`, `ai-safety`,
`observability`, `supported-providers`, and four `guides/*` slugs. None has a
route. They are `NOINDEX` with empty locales, so they leak into nothing — but
they encode a _different_ information architecture from the one being built.
Four `guides/*` slugs collide with the `/learn` GUIDE hub decided in §4; a
fifth, `workspace-connectors`, was added to this list once the boardroom
review (§8) put `/integrations` in scope — it collides with that WORKSPACE
hub the same way.

**Resolved:** the hub scheme wins (see §4). Colliding PLANNED slugs are
retired rather than left as a second, contradictory roadmap.

### F2 — `/supported-models` deliberately publishes no model names

The page states its own policy:

> "A static list of fashionable model versions becomes inaccurate quickly and
> can imply credentials that are not configured."

It names implemented _provider families_ and defers to the live catalog. It
also records that **AWS Bedrock is connector scaffolding whose model
synchronisation is not implemented**, and is therefore excluded on purpose.

This is correct and stays. It does, however, mean there is no existing source
for model-level content, and no public catalog API — the live registry sits in
routing-service behind auth and varies per deployment.

**Resolved:** a curated, dated `MODEL_FACTS` module (§3) becomes the single
source for every model-level page, explicitly framed as a reviewed editorial
snapshot rather than the live catalog.

### F3 — RSS carries pages with no publication semantics

`buildGlobalRssResponse` maps **every** indexable registry page into the feed,
so `/terms`, `/privacy`, `/cookies`, `/acceptable-use` and `/contact` are feed
items whose `pubDate` is the site-wide review date. A subscriber is notified
about the cookie policy.

**Resolved:** the feed filters to categories with genuine publication
semantics. The mechanism is a category predicate, so the rule stays in one
place and a new cluster opts in deliberately.

### F4 — `/use-cases` and `/features` are single pages, not hubs

Both rank for one broad head term and cover many intents in one document. Each
is the natural parent of a cluster and currently has no children.

**Resolved:** both become hubs, keeping their existing URL and improving rather
than replacing them. No redirect, no lost equity.

### F5 — no topical clusters exist

Nothing covers the informational half of the funnel: what model routing _is_,
what orchestration _is_, which model suits which task, what each connector
actually does. Every existing page is bottom-of-funnel. This is the entire
opportunity.

### F6 — three proposed provider pages would be fabrications

`/models/qwen`, `/models/kimi` and `/models/glm` were proposed. `ConnectorProvider`
has no such members; Qwen, Kimi and GLM exist only as `/compare` **rivals**
(competitor products), and as open-weight models a user may run locally through
Ollama. A provider page would claim a connector that does not exist.

**Resolved:** not built as provider pages. Their open-weight local story is
covered honestly by `/models/local-ai`.

### F7 — IndexNow absent

Deliberately deferred with a written reason (needs a hosted key file, a new env
var, and the full 18-item infra propagation; Bing Webmaster manual submission
covers the same ground). **Decision reaffirmed 2026-08-30 — unchanged.**

### F9 — the live site already contradicts the product (must fix)

Found while verifying the capability inventory. Three counts are written as
prose into `public-comparison-content/<locale>.constants.ts` — **thirteen
copies each** — and two are now wrong:

| Claim on the site              | Reality in code                                                                 | Verdict                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| "Twelve workspace connectors"  | `WorkspaceProvider` has **14**, all with adapters                               | **Wrong.** Google Calendar and Outlook Calendar were added and never propagated                                               |
| "Five routing modes"           | `RoutingMode` has **7**, and `ROUTING_MODE_LABELS` renders all 7 in the product | **Wrong.** The homepage collapses three router biases into one bullet; the count then under-reports what a user actually sees |
| "Nine frontier model families" | `ConnectorProvider` has 5 cloud providers + 2 local runtimes                    | **Unverifiable as written.** Nothing in the code produces the number nine                                                     |

This is the drift the brief warns about, and it happened in the ordinary way:
someone added a connector and had no reason to think a comparison page in
Thai depended on the count.

**Resolved:** counts are **derived, never typed**. Content strings take a
placeholder — `'{connectorCount} workspace connectors'` — and the count comes
from the enum at render time, through the same interpolation the comparison
pages already use for `{rival}`
(`utilities/public-comparison.utility.ts`). A count can then only be wrong if
the enum is wrong, and adding a connector updates 13 locales for free.

`PRODUCT_COUNTS` in the shared facts module owns every derived number.

### F8 — no cannibalisation in the existing surface

Every current page owns a distinct intent. `/compare/*` (rival products) and the
new `/compare/models/*` (model-vs-model) are different intents and must stay
visibly different, which is the one real cannibalisation risk introduced here.

---

## 3. Source of truth for model facts

`constants/model-facts.constants.ts` — one module, consumed by every
model-level page.

Grounded in `model-cost-seed.constants.ts` (16 models across 5 providers, the
list the product actually prices) and `ConnectorProvider` (which adapters
exist). Carries per model: provider, positioning, strengths by task, relative
speed and cost band, context posture, and whether it can run locally.

Rules:

- **Dated.** `MODEL_FACTS_REVIEW_DATE` renders on every consuming page and
  drives `dateModified`. Moving it without re-checking the claims is prohibited.
- **Qualitative, never benchmarked.** No invented scores, no fabricated
  latency, no leaderboard positions.
- **One copy.** A page that needs a model fact imports it. A second hardcoded
  list anywhere is a defect.
- **Provider families are the honest unit.** Where a claim would need a version
  number to be true, it belongs to the family, not the page.

---

## 4. URL architecture

Existing URLs are unchanged. Everything below is additive.

| Hub                     | Children                                                                     | Intent                   |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| `/learn`                | concept pages (`what-is-*`, `cloud-ai-vs-local-ai`, `ollama-vs-llamacpp`, …) | Informational            |
| `/models`               | `openai`, `anthropic`, `google`, `deepseek`, `xai`, `local-ai`               | Commercial investigation |
| `/compare/models`       | model-vs-model pairs                                                         | Comparison               |
| `/best-ai-model`        | task pages (`coding`, `reasoning`, `writing`, …)                             | Commercial investigation |
| `/integrations`         | 14 verified connectors                                                       | Commercial investigation |
| `/use-cases` _(exists)_ | task pages                                                                   | Commercial investigation |
| `/features` _(exists)_  | capability pages                                                             | Commercial investigation |
| `/solutions`            | role pages                                                                   | Commercial investigation |
| `/industries`           | private-deployment verticals                                                 | Commercial investigation |
| `/prompts`              | prompt guides                                                                | Informational            |
| `/tools`                | model selector                                                               | Transactional-adjacent   |

**Cannibalisation rules, decided once:**

- `/best-ai-model/coding` is the single canonical page for _"best AI/LLM/model
  for coding/programming"_. `/learn/best-ai-model-for-coding` is **not built**.
- `/use-cases/*` targets the **task**; `/solutions/*` targets the **role**. A
  role page that would only restate a task page is not built.
- `/compare/*` is **product vs product**; `/compare/models/*` is **model vs
  model**. Different H1 shapes, different tables, cross-linked.
- `/learn/*` defines a concept; `/features/*` documents ClawAI's implementation
  of it. Every learn page links to its feature page and vice versa; neither
  duplicates the other's job.

---

## 5. Implementation batches

Each batch is independently gated, committed and pushed.

| Batch | Contents                                                                                                                           | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 0     | This document, retire the four `guides/*` PLANNED slugs, shared SEO components, cluster scaffolding, RSS publication-semantics fix | P0       |
| 1     | `/learn` hub + concept pages                                                                                                       | P0       |
| 2     | `/integrations` hub + 14 connector pages, retire the `workspace-connectors` PLANNED slug                                           | P0       |
| 3     | `/models` hub + 6 provider pages, `MODEL_FACTS`                                                                                    | P0       |
| 4     | `/use-cases` hub + task pages                                                                                                      | P1       |
| 5     | `/best-ai-model` + `/compare/models`                                                                                               | P1       |
| 6     | `/features` hub + capability pages                                                                                                 | P1       |
| 7     | `/solutions` + `/industries`                                                                                                       | P2       |
| 8     | `/prompts` + `/tools`                                                                                                              | P2       |
| 9     | Internal-link sweep, nav/footer clusters, final verification                                                                       | P0       |

**Definition of done for every page**, enforced by the four coverage tests plus
Lighthouse: route resolves under `/{locale}/`; registry entry `PUBLISHED` +
`REVIEWED` + `INDEXABLE`; 13 locales of SEO metadata _and_ body copy; URL in
`lighthouserc.json`; reachable from footer or hub; exactly one `h1`; breadcrumbs
with `BreadcrumbList`; no fabricated claim.

---

## 6. Refused deliberately

Recording these so they are not re-proposed as oversights.

| Refused                                                                  | Why                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `/models/qwen`, `/models/kimi`, `/models/glm`                            | No such connector exists (F6)                                                              |
| `/models/amazon-bedrock`                                                 | Scaffolding only; already excluded by `/supported-models` (F2)                             |
| `/learn/best-ai-model-for-coding`                                        | Same intent as `/best-ai-model/coding` (§4)                                                |
| Benchmark tables                                                         | No trustworthy first-party data; fabrication is forbidden                                  |
| Compliance claims (SOC 2, ISO 27001, HIPAA, FedRAMP, GDPR certification) | Not held. Industry pages say "designed for private deployment"                             |
| `/tools/local-ai-hardware-calculator`                                    | Requires hardware data the repo does not have; a guessed recommendation is worse than none |
| IndexNow                                                                 | Deferred with reason (F7)                                                                  |
| Indexable tool permutation URLs                                          | Combinatorial thin content; the tool is one canonical page                                 |

---

## 7. Verified capability inventory

Every factual claim on a new page must trace to a row here. Each was read out
of the code on 2026-08-30, with the file that proves it. **Nothing on a public
page may assert a capability absent from this table.**

### Cloud model providers — `ConnectorProvider`

`packages/shared-types/src/enums/connector-provider.enum.ts`

| Provider      | Adapter              | Seeded models                                                   | Public page         |
| ------------- | -------------------- | --------------------------------------------------------------- | ------------------- |
| OpenAI        | yes                  | `gpt-5`, `gpt-5-mini`, `gpt-4o`, `gpt-4o-mini`, `o3`, `o4-mini` | `/models/openai`    |
| Anthropic     | yes                  | `claude-opus-4`, `claude-sonnet-4`, `claude-haiku-4-5`          | `/models/anthropic` |
| Google Gemini | yes                  | `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`   | `/models/google`    |
| DeepSeek      | yes                  | `deepseek-chat`, `deepseek-reasoner`                            | `/models/deepseek`  |
| xAI Grok      | yes                  | `grok-4`, `grok-3-mini`                                         | `/models/xai`       |
| Ollama        | yes                  | open-weight, operator-chosen                                    | `/models/local-ai`  |
| llama.cpp     | yes                  | open-weight, operator-chosen                                    | `/models/local-ai`  |
| AWS Bedrock   | **scaffolding only** | none                                                            | **no page**         |

Model list from `apps/claw-routing-service/src/modules/router-models/constants/model-cost-seed.constants.ts`
— the 16 models the product actually prices.

### Routing modes — `RoutingMode` (7)

`packages/shared-types/src/enums/routing-mode.enum.ts`

`AUTO` · `MANUAL_MODEL` · `LOCAL_ONLY` · `PRIVACY_FIRST` · `LOW_LATENCY` ·
`HIGH_REASONING` · `COST_SAVER`

### The nine orchestration labs — `TokenLedgerContext` → `PaygSurface.ORCHESTRATION`

`apps/claw-chat-service/src/modules/chat-messages/constants/payg.constants.ts`

`REPAIR` · `VERIFY` · `CONSENSUS` · `ESCALATION_CHAIN` · `BEST_OF_N` ·
`COST_ENSEMBLE` · `ROLE_PACK` · `PIPELINE` · `TASK_DECOMPOSITION`

Judge and Compare are separate surfaces (`PaygSurface.JUDGE`, `.COMPARE`), not
labs. `COST_ENSEMBLE`, `ROLE_PACK` and `TASK_DECOMPOSITION` were not in the
original brief and are genuine uncovered opportunities.

### Plan-gated features — `PlanFeature`

`packages/shared-types/src/enums/plan-feature.enum.ts`

`COMPARE_MODE` · `JUDGE_MODE` · `RESEARCH_MODE` · `WEB_SEARCH` · `WEB_FETCH` ·
`WEB_EXTRACT` · `CRITIC_REVIEW` · `WORKSPACES` · `MEMORY` · `CONTEXT_PACKS`

### Workspace connectors — `WorkspaceProvider` (14, all with adapters)

`packages/shared-types/src/enums/workspace-provider.enum.ts`, adapters verified
in `apps/claw-workspace-service/src/**/adapters/`

GitHub · GitLab · Bitbucket · Slack · Jira · Confluence · Figma · ClickUp ·
Google Drive · Gmail · SharePoint · OneDrive · Google Calendar · Outlook Calendar

Google Calendar and Outlook Calendar were absent from the brief; both have real
adapters and get pages.

### Other paid surfaces — `PaygSurface`

`CHAT` · `COMPARE` · `JUDGE` · `ORCHESTRATION` · `IMAGE` · `FILE_GENERATION` ·
`CODING_AGENT` · `WORKSPACE_ACTION` · `ROUTING`

Research is deliberately **not** a paid model surface — it reaches search
providers and is metered as `WEB_SEARCH` / `WEB_FETCH` / `WEB_EXTRACT`. A page
claiming "research uses your model credit" would be wrong.

---

## 8. Plan-time boardroom review — three vetoes, and what they changed

Reviewed 2026-08-30 before any page was written. Business-owner, CTO and
operations lenses each returned **VETO**. Every finding below is resolved in the
plan rather than deferred, because a veto at plan time is cheap and the same
veto after eight batches is not.

### 8.1 Claim liability — the plan would have published unsourced claims

**`MODEL_FACTS` may not carry speed.** The only in-repo source for latency is
`apps/claw-routing-service/src/modules/router-models/constants/cloud-model-intelligence.constants.ts`,
whose own header attributes latency classes to "ClawAI's router benchmark suite
(see `qa/routing-latency-baseline/`)". **That directory does not exist.**
Publishing a speed band in 13 languages citing a benchmark suite that is not in
the repository is a fabricated claim with a fabricated citation.

→ Speed is **not published**. Not qualitatively, not at all, until a real
measurement exists.

**That file must not be a source at all.** It carries unsourced disparagement of
named third-party products — `avoidFor: ['high_reasoning', 'legal_drafting']`
for GPT-4o-mini, `weakDomains` for GPT-4o. Those are internal routing
heuristics. Published, they are trade-libel exposure in 13 languages. It also
lists `mistral-large-latest`, `command-r-plus`, `qwen-max` and
`moonshot-v1-128k` — providers with **no `ConnectorProvider` member** — which
would silently undo F6.

→ `MODEL_FACTS` is grounded **only** in `model-cost-seed.constants.ts` plus
vendor documentation. Every entry carries a `source` and a vendor URL. **A fact
with no vendor URL is not published.**

**Naming a model is an entitlement claim.** `/pricing` already refuses it in as
many words: _"this page does not promise a specific model on a specific tier.
Confirm the live catalog before choosing a plan for one model."_
`docs/business/plan-allowances.md` records a prior incident where one page
overstated the enforced allowance **fifteen-fold**. This plan would multiply that
claim surface from one page to ~1,300 documents, and
`docs/business/rollout-and-notice.md` discharges allowance-change notice _on the
pricing page_ — a mechanism that cannot work once the claim lives in 1,300 places.

→ Every page naming a model carries the same "confirm the live catalog"
qualifier, in all 13 locales, and links to `/pricing`. No page pairs a model
name with a signup CTA implying that model is included in a given tier.

### 8.2 Pages that changed shape or will not be built

| Was planned                                                                          | Now                                                                          | Why                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/industries/healthcare`, `/industries/financial-services`, `/industries/government` | **Not built**                                                                | An industry page addressed to a regulated buyer is an implied offer of a contractual instrument. `public-launch-content/en.constants.ts` records that ClawAI offers **no data-processing agreement**. HIPAA needs a BAA; "designed for private deployment" does not discharge one. Blocked pending `docs/business/regulated-vertical-claims.md` |
| `/industries/*` generally                                                            | Hub over **unregulated** verticals only                                      | Same reasoning; agencies, software teams, research and education carry no implied instrument                                                                                                                                                                                                                                                    |
| `/compare/models/gpt-vs-claude` (model vs model)                                     | `/compare/models/*` reframed: **"how ClawAI's router chooses between them"** | Comparative advertising in `de fr it es pt` must compare verifiable material features objectively (Dir. 2006/114/EC art. 4; German UWG §6 is competitor-enforced). A page comparing two products we sell neither of, with benchmarks refused, substantiates nothing. A claim about **our own routing behaviour** is substantiable               |
| `/best-ai-model/coding`                                                              | `/models/for/coding` — _"Choosing a model for coding"_                       | "Best" is an unsubstantiated superlative about third-party products, and §6 refuses benchmarks, so it is unsubstantiable **by construction**. Same intent, same traffic, no superlative                                                                                                                                                         |
| "14 **verified** connectors"                                                         | "14 connectors", copy generated from the provider registry                   | 8 of 14 have `webhooks: false` (three were flipped from `true` because they were lying); Bitbucket and Jira webhook verifiers are no-op stubs returning `signatureValid: true`; both calendars support exactly one write action. "Real-time sync" and "signature-verified" are false for specific connectors                                    |

**Ad eligibility, decided rather than defaulted.** `/compare/*` is
`INELIGIBLE` on recorded reasoning — "a page whose job is to be a fair,
checkable comparison of named competitors does not also carry ad inventory."
That reasoning applies verbatim to every new cluster that names a third party.

→ `INELIGIBLE`: `/compare/models/*`, `/models/*`, `/models/for/*`,
`/integrations/*`, `/industries/*`. `ELIGIBLE`: `/learn/*`, `/use-cases/*`,
`/features/*`, `/solutions/*`. Publishing ~100 pages at once ad-eligible is also
an AdSense scaled-content exposure.

**`reviewDate` is mandatory** for every cluster naming a third party, not just
`/compare/*`. A comparison without a visible date is a claim with no expiry.

### 8.3 Architecture — decisions that were being made implicitly

| Fork                        | Decision                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fan-out shape at 100 pages  | **ADR-084.** The existing comparison cluster fans out only **one of five layers** (registry config). Slug enum, SEO copy, route file and Lighthouse URL are all hand-written ×9. At 100 pages that is 100 enum members, 1,300 SEO blocks, 100 route files. Resolved as a **dynamic segment per cluster** (`/learn/[topic]` + `generateStaticParams` off the cluster order array) |
| `PUBLIC_PAGE_SEO_BY_LOCALE` | **Pluggable.** 168 KB / 2,391 lines today for 28 slugs; ~770 KB and ~10,900 lines at 128 — the exact shape TypeScript checks superlinearly, and every batch would edit the same file. Each cluster owns its SEO copy beside its body copy; `buildLocalizedMetadata` resolves through a registry of providers                                                                     |
| Feed eligibility            | **A field on the definition, not a category predicate.** The registry already answers "which surfaces does this page appear on" per definition (`indexability`, `adEligibility`). Keying on `ContentCategory` would mean two pages in one category can never differ, and adds a second way to express the same kind of fact                                                      |
| Lifecycle                   | **`RETIRED` added.** There is currently no way to un-publish. Rolling back a batch deletes the routes and turns every already-crawled URL into a soft 404 across 13 locales at once — worse than the bad page. The point of no return is the **first successful production deploy**, not the merge                                                                               |

### 8.4 Operational ceilings — measured, not estimated

Lighthouse CI timings from four consecutive real runs: **13.9 s per audit,
±5 s**. 28 URLs × `numberOfRuns: 2` = 56 audits = **13 min** today.

| Cumulative URLs | Audits | Lighthouse step     |
| --------------- | ------ | ------------------- |
| 28 (today)      | 56     | 13 min _(measured)_ |
| 61              | 122    | ~28 min             |
| 128 (end state) | 256    | **~59–77 min**      |

`lighthouse-coverage.test.ts` asserts the audited set equals the indexable set
**in both directions**, so this growth is mandatory — there is no sampling
escape hatch — and `categories:best-practices` at `minScore: 1` means **one bad
audit in 256 fails the run**. The workflow has no `concurrency:` group and no
`timeout-minutes`.

→ Batch 0 adds both guards, repairs `docs/09-testing/lighthouse-ci.md` (which
already says "eight published public pages" and `0.95`, against a reality of 28
and `1`), records the `minutes ≈ URLs × 0.46` formula, and **caps
`/compare/models` explicitly** — C(16,2) = 120 pairs are possible and nothing
bounded it.

**`RSS_GLOBAL_MAX_ITEMS = 2000` truncates silently**, and the truncation eats
pages rather than chats: `global-rss.service.ts` sorts by `publishedAt`
descending before slicing, page items carry a fixed `lastReviewed` while chat
items carry live timestamps, so **every chat sorts ahead of every page**. Two
documents already compute the ceiling from "13 locales × 16 pages" and are stale
at 28.

→ Batch 0 fixes the arithmetic, the comments, and adds a test that fails
_before_ the ceiling is reached.

**Not affected, asserted rather than assumed:** nginx needs no change (the
catch-all `location /` is declared last, and these are not API paths); no new
env vars; no compose changes; `SITEMAP_URL_CHUNK_SIZE = 40_000` is three orders
of magnitude clear. Build time is a non-event (~36 s → ~90–150 s) because every
marketing page reads `headers()` and renders dynamically, so **locale is not a
build multiplier**.

### 8.5 Debt accepted, with triggers

| #   | Debt                                                                                                                                                    | Trigger to repay                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `MODEL_FACTS` duplicates a routing-service constant across a workspace boundary with no drift detector                                                  | A model added to or removed from `MODEL_COST_SEED`, or `MODEL_COST_SEED_VERSION` bumped                                                                                    |
| D2  | The footer's `explorePages` is a **deny-list**; every new page joins one site-wide column                                                               | Inverted to opt-in in Batch 0, not Batch 9 — seven batches would otherwise pass Lighthouse on a footer degrading each time                                                 |
| D3  | `/llms.txt` partitions by deny-list too, so all ~100 new pages flatten into one "Product" section                                                       | Same Batch 0 change                                                                                                                                                        |
| D4  | Retiring PLANNED slugs empties `PLANNED_CONTENT_CONFIGS`, leaving `ContentLifecycleStatus.PLANNED` with zero instances and its fallback branch untested | Decided in Batch 0/2: retire only the colliding slugs (the four `guides/*` in Batch 0, plus `workspace-connectors` in Batch 2 once `/integrations` shipped), keep the rest |
| D5  | CI cannot detect a production `SITE_URL` misconfiguration — `lighthouse.yml` sets its own                                                               | Post-deploy verification step added to §5                                                                                                                                  |

### 8.6 The boundary the CTO explicitly upheld

`MODEL_FACTS` as a **frontend constants module** was challenged and confirmed
correct. Crossing to routing-service's live catalog would require a new
unauthenticated public endpoint exposing precisely what that service refuses to
expose (a full provider rate card is a margin input); it would make marketing
pages vary per deployment (a self-hoster with no OpenAI key rendering an empty
`/models/openai` that Google has already indexed); and it would put a runtime
frontend→routing-service dependency on the SEO critical path, where an outage
empties indexed pages.
