# Model price ledger and per-plan cap proposal (2026-10-30)

Workstream 2 of [the three-workstreams plan](three-workstreams-plan-2026-10-30.md). Part 1 is applied
(seed v13). Part 2 is a proposal that needs the owner's approval before anything enforces it.

## Part 1. Official text-model prices (applied as seed v13)

Read on 2026-10-30 from the provider's own page. Confidence: `VERIFIED_OFFICIAL` (a list price, not a
negotiated rate). Stored as `source: SEED`, `confidence: ESTIMATED`, so an admin override or a synced
price always wins.

| Provider  | Source page                                                    | Models priced in v13                                                                                                   |
| --------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Anthropic | https://platform.claude.com/docs/en/about-claude/pricing       | 11 (Fable 5 and 5.1, Opus 5.5, 5, 4.8, 4.7, 4.6, 4.5, Sonnet 5, 4.6, 4.5)                                              |
| OpenAI    | https://developers.openai.com/api/docs/pricing (Standard tier) | 24 (gpt-5.1 to 5.6, minis, nanos, pro, gpt-4.1 family, o1, o1-pro, o3-pro, o3-mini, gpt-4, gpt-4-turbo, gpt-3.5-turbo) |
| Gemini    | https://ai.google.dev/gemini-api/docs/pricing                  | 7 new, plus the cache-hit rate of 3 existing 2.5 rows corrected                                                        |
| xAI       | https://docs.x.ai/docs/models                                  | 8 (grok-4.7, 4.6, 4.5, 4.3, 4.20 x3, build-0.1)                                                                        |

Why it matters: 155 exposed models were billed at their provider's **dearest** row. `claude-sonnet-5`
cost $15/$75 per million tokens against an official $2/$10 (7.5x), `grok-4.7` $3/$15 against $2/$6, every
Gemini 3.x model at the dearest Gemini row. Users were charged too much and their allowance drained
faster. Measured on the local stack after the seed ran: `PROVIDER_FALLBACK` 155 to 85, `PUBLISHED` 12 to 56,
`DATED_FAMILY` 22 to 48.

### Decisions in the numbers

- `gemini-3.6-flash` and `gemini-3.8-flash` are half price until 2026-12-31. They are seeded at the
  2027-01-01 price so the table is not under-priced after the promotion.
- Gemini and OpenAI rows use the text/image/video input rate. Audio input to Gemini Flash-Lite is
  dearer and is under-priced by this one rate.
- Anthropic cache write is the 5-minute rate (1.25x input). Fable 5.1 cache hits are 0.025x input and
  Opus 5.5 0.05x; every other model 0.1x.
- Pro models (`*-pro`, `o1-pro`, `o3-pro`) publish no cached rate, so it is null, not free.
- Cost class follows the output price: under $1 CHEAP, under $6 STANDARD, under $40 PREMIUM, above that ULTRA.

### Known gaps (documented, not hidden)

- **Long-context tiers are not expressible.** OpenAI bills 2x input and 1.5x output above 272k input tokens
  (gpt-5.4 and later), Gemini Pro and xAI 2x above 200k, Claude Haiku 5.5 above 100k. A prompt past the
  threshold is under-priced until tier rules exist. The per-call input cap below (200k) keeps every plan
  under the lowest of these thresholds except Haiku 5.5, which is not exposed.
- Anthropic models from 4.7 on use a tokenizer that yields about 30% more tokens for the same text, so a
  character-based estimate is low for them.
- Batch, flex, priority, web-search ($5 per 1,000 calls on xAI) and other tool fees are not in a token rate.
- Not priced by v13, still on the fallback or unpriced, on purpose: embeddings; image, video, audio,
  TTS and music models (per-unit billing, not on these pages); `*-codex`, `*-chat-latest`, `*-search`,
  `*deep-research*` (not on the page); `-latest` aliases (the target model is unknown); Gemini 2.0 and
  3.5/3.7 Flash, `gemini-3-pro-preview`, robotics, antigravity, lyria (not on the page).
- OpenRouter: 449 models stay `UNPRICED`, so paid dispatch is refused (fail closed). They need a
  per-model price or an explicit decision.
- Groq: no official price page could be fetched (`groq.com/pricing` is a marketing page,
  `console.groq.com/docs/pricing` returned 404) and Groq is not in this registry. Not seeded.
- DeepSeek: official page read (`deepseek-flash`, `deepseek-v4-pro`, with peak and off-peak rates) but the
  provider is not exposed, so nothing is seeded. Use the peak rate when it is added.

## Part 2. Per-plan call caps (proposal, not applied)

Source of the numbers: `plan-catalog.json` (monthly cost ceiling = 1,000,000 weighted tokens per dollar,
about 25 to 30 percent of the plan price) and the prices above. Rule: **one call may spend at most 10% of the
plan's monthly provider-cost ceiling**; input is capped at 200,000 tokens so no plan crosses a long-context
price tier; output follows the pack's proposal. Smallest limit wins over the model's own window.

| Plan      | Price | Monthly ceiling | maxInputTokens | maxOutputTokens | maxCostPerCall |
| --------- | ----- | --------------- | -------------- | --------------- | -------------- |
| Free      | $0    | $0.30           | 16,000         | 2,000           | $0.03          |
| Starter   | $5    | $1.50           | 32,000         | 4,000           | $0.15          |
| Plus      | $10   | $3.00           | 64,000         | 8,000           | $0.30          |
| Pro       | $20   | $5.00           | 128,000        | 16,000          | $0.50          |
| Team      | $50   | $12.50          | 200,000        | 24,000          | $1.25          |
| Scale     | $100  | $25.00          | 200,000        | 32,000          | $2.50          |
| Unlimited | $200  | $50.00          | 200,000        | 64,000          | $5.00          |

Unconstrained worst case of one call (max input plus max output) against that cap. `*` means the cap
binds and the call is refused or its output clamped.

| Plan      | gemini-3.5-flash-lite | gpt-5.4-mini | claude-sonnet-5 | gpt-5.5  | claude-fable-5 | gpt-5.5-pro |
| --------- | --------------------- | ------------ | --------------- | -------- | -------------- | ----------- |
| Free      | $0.010                | $0.021       | $0.052\*        | $0.140\* | $0.260\*       | $0.840\*    |
| Starter   | $0.020                | $0.042       | $0.104          | $0.280\* | $0.520\*       | $1.680\*    |
| Plus      | $0.039                | $0.084       | $0.208          | $0.560\* | $1.040\*       | $3.360\*    |
| Pro       | $0.078                | $0.168       | $0.416          | $1.120\* | $2.080\*       | $6.720\*    |
| Team      | $0.120                | $0.258       | $0.640          | $1.720\* | $3.200\*       | $10.320\*   |
| Scale     | $0.140                | $0.294       | $0.720          | $1.960   | $3.600\*       | $11.760\*   |
| Unlimited | $0.220                | $0.438       | $1.040          | $2.920   | $5.200\*       | $17.520\*   |

Reading it: cheap and standard models are never constrained. Without a cap, one `gpt-5.5-pro` call on
Unlimited can cost $17.52, 35% of that plan's whole month. The Free plan cannot reach the starred models
anyway (its cost classes are FREE, CHEAP, STANDARD).

### Not yet enforced. What the code audit found (2026-10-30)

The owner approved the table. Enforcement was started and stopped at the audit, because the seam is not
where the proposal assumed:

- `CreditReservationManager.reserve` (auth-service) is the one chokepoint every chat provider call reaches.
  For a **credit (PAYG) connector** it already clamps the output to what the wallet and a Threads job cap
  allow (`takeHold`, `spendCeilingMicroUsd`, `clampOutputTokensToBalance`). A wallet already bounds that spend.
- For a **platform-paid** provider (the plan's own key, for example Gemini) it answers `metered: false` and
  echoes the requested output size. There is no per-call dollar check on that branch, and that branch is the
  one where the platform pays. This is where the caps must go.
- `RuntimeAdmissionService` covers Runtime V2 only, and the legacy `/quota/reserve` is token-only.
- A refusal needs a new coded error. The existing `PAYG_CAP_TOO_LOW` and `PAYG_PROMPT_TOO_EXPENSIVE` give
  wrong advice here (raise a Threads cap, add credit). A new code touches shared-types, chat-service
  `payg.constants`, `credit-fallback.utility`, four frontend enum/constant files and 13 locales.

Work to do, in order: nullable `maxInputTokens`, `maxOutputTokens`, `maxCostPerCallMicroUsd` on the plan with a
migration (rule 52) and a seeder that only fills nulls; the cap check in the unmetered branch of `reserve`
(clamp output first, refuse when the prompt alone is over); the new code with its 13 locales; tests and a live
run on a platform-paid model. It changes who is refused, so it is its own batch with its own ADR.
