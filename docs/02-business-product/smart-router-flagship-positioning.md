# ClawAI Smart Router — Flagship Positioning

> Sales / marketing copy reference. Every quantified claim below must match
> a number the observability dashboard can produce against real traffic.
> If a claim is aspirational, mark it `[V1.1+]`.

## One-liner

**"ClawAI routes every task to the best model automatically — local or cloud,
free or premium, fast or deep — without you ever picking one."**

## What ClawAI is NOT

- Not another chat UI on top of OpenAI.
- Not a thin multi-provider proxy that round-robins requests.
- Not an observability layer that watches LLM calls but doesn't change them.

The router IS the product. Chat is the surface. Connectors are utilities.

## What ClawAI IS

A model-intelligence control plane that:

1. **Knows every model** — local + cloud, with cost / latency / quality /
   modality / privacy / lifecycle annotations in a single canonical registry.
2. **Classifies every task** — 15 domains × ~400 keyword fingerprints +
   privacy/risk derivation + 13 multi-step workflows (PDF extraction,
   YouTube transcript, image gen, compare-ensemble, judge pipeline).
3. **Scores every candidate** — 14 dimensions with per-mode weight vectors
   (COST_SAVER prefers cost; HIGH_REASONING prefers capability;
   PRIVACY_FIRST prefers local).
4. **Survives failure** — persisted circuit breakers exclude failing
   providers, deterministic fallback chain, structured `noExecutionModelIssue`
   when no executor qualifies.
5. **Learns from feedback** — bounded `LearnedScore` updates (clamped to
   `[0.3, 0.95]`) per (model, domain, taskFamily); thumbs and judge
   outcomes nudge ranking without ever permanently killing a model.
6. **Auditable** — every decision routed, every override applied, every
   circuit-breaker transition is audited in MongoDB; PRIVACY_FIRST
   compliance can be proven from the audit log alone.

## Competitive landscape

| Competitor                   | Approach                       | Where ClawAI wins                          |
| ---------------------------- | ------------------------------ | ------------------------------------------ |
| OpenRouter                   | Multi-provider proxy           | No taxonomy, no domain awareness, no local |
| LiteLLM                      | Multi-provider proxy + retries | Same — no domain awareness                 |
| Helicone / Portkey           | Observability + caching        | No routing intelligence                    |
| Vercel AI Gateway            | Round-robin                    | No domain/cost/privacy awareness           |
| Claude Code / Cursor         | Single-vendor                  | No routing at all                          |
| Self-built internal gateways | Hard-coded                     | No taxonomy, no learning loop              |

ClawAI is the **only** option that combines: 1000+ role-aware taxonomy,
local + cloud + frontier-local routing, persisted CBs, bounded learning,
and a Zod-validated route-only contract.

## Quantifiable advantages (targets to validate in observability)

The flagship release ships with these claims **achievable** because the
infrastructure supports them — they will be verified in the post-launch
observability dashboard:

- **Cost-saved vs cloud-only baseline** — target ≥ 35% in V1, ≥ 50% in V2.
- **Routing accuracy** (judge-verified) — target ≥ 85% in V1, ≥ 92% in V2.
- **Routing latency p95** — target ≤ 400ms warm, ≤ 200ms with cache (V1.1+).
- **Privacy-class violation rate** — target 0 (PRIVACY_FIRST never leaks
  to cloud; provable via audit log).
- **Fallback-rescue success** — target ≥ 95% (CB-aware routing).
- **Time-to-onboard-a-new-model** — target ≤ 5 minutes (sync + tag UI).
- **Manual-override rate** (proxy for trust) — target ≤ 20% in V1,
  ≤ 8% in V2.

## Personas

| Persona                                                | Win condition                                            |
| ------------------------------------------------------ | -------------------------------------------------------- |
| End user (Sara, marketing manager)                     | "I asked, it answered, I didn't pick a model."           |
| Power user (Daniel, senior engineer)                   | "Override is one click. AUTO is right 80%+ of the time." |
| Compliance officer (Dr. Patel, physician using ClawAI) | "I can prove HIPAA-safe routing from the audit log."     |
| Operator (Marco, DevOps)                               | "Adding a new model takes 5 minutes, not a deploy."      |
| CFO                                                    | "We saved $X this month vs naive cloud-only routing."    |

## Demo flow (90 seconds)

1. **Login** → land in chat. Ask: "Help me debug this Python KeyError."
   See routing badge: `Anthropic / Claude Sonnet 4` (CODING domain, S-tier).
2. **Toggle PRIVACY_FIRST** in the routing control center. Ask: "What are
   the contraindications for warfarin alongside fluconazole?" See badge
   change to `OLLAMA / medgemma:27b` (MEDICAL domain, LOCAL_PREFERRED).
3. **Open /routing/models**. Filter by `provider=ANTHROPIC`. Show the
   detail drawer: cost EXACT $3/$15 per 1M, latency MEDIUM, S-tier,
   judge-suitable, no active admin overrides.
4. **Override `outputCostPer1M` to $20**. Show the override row appears.
   Trigger a sync (Phase 6 endpoint, when available). Confirm the
   override persists — upstream value is ignored.
5. **Open /routing/observability** (Phase 11 dashboard, JSON endpoint
   available; UI in V1.1). Show `costSaved`, `routesByDomain`,
   `manualOverrideRate`, `noExecutionModelCount`.

## Roadmap

| Version             | Theme                                                                                                                                                   | Status            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| V1.0 (this release) | Registry + classifier + scorer + route-only + 13 workflows + bounded learning + CBs + observability summary + admin model registry UI                   | **Shipped**       |
| V1.1                | Sync workers in connector/ollama/llamacpp + chat-service migrates to `/evaluate-v2` + policies UI weights editor + simulator UI + 60-prompt browser UAT | Plan-prompt ready |
| V2                  | A/B testing of policies + per-tenant policies + cost-saved CFO dashboard                                                                                | Roadmapped        |
| V3                  | Custom-domain enums per tenant + adaptive weight tuning (bounded)                                                                                       | Roadmapped        |
| V4                  | Auto-discovery of upstream models (webhook-driven instead of cron)                                                                                      | Roadmapped        |
| V5                  | Fine-tuned router models per industry                                                                                                                   | Speculative       |
| V6                  | Marketplace of community model cards + route profiles                                                                                                   | Speculative       |

## Press release draft

> **ClawAI ships Smart Router v1.0 — every AI task auto-routed to the best
> model across 8 providers, with bounded learning and provable privacy.**
>
> [DATE] — ClawAI today announced the v1.0 release of its Smart Router
> flagship, a model-intelligence control plane that automatically picks
> the optimal AI model — local or cloud — for every chat task. Built on a
> canonical registry of 200+ models across OpenAI, Anthropic, Gemini,
> Grok, DeepSeek, Bedrock, Ollama, and llama.cpp, the router classifies
> each prompt into one of 15 domains, scores candidates across 14
> dimensions (capability, cost, latency, privacy, modality, learned
> success, …), and routes accordingly — without the user ever choosing
> a model.
>
> Operators can override cost, lifecycle, or routing-only flags from a
> single admin UI; overrides survive upstream syncs. A bounded learning
> loop nudges per-domain performance metrics within `[0.3, 0.95]`
> guardrails so no single bad day can kill a previously-trusted model.
> Persisted circuit breakers route around failing providers and survive
> container restarts. Every routing decision is auditable for SOC 2
> and HIPAA review.
>
> "The model landscape exploded — OpenAI 4 generations × 8 sizes,
> Anthropic 3 × 4, Gemini, Grok, DeepSeek V4, Llama 4, GLM-5, MedGemma.
> Users can't keep up. ClawAI just routes." — Founder.

## Sales one-pager bullets

- **Stop picking models. Start trusting the router.**
- **Local-first for compliance, cloud-best for capability — automatic.**
- **One admin UI for cost, quality, privacy. One audit log for compliance.**
- **Add a new model in 5 minutes, not a deploy.**
- **Bounded learning: no single bad day kills a trusted model.**
- **Open architecture: extend the taxonomy, override anything, audit everything.**

## Internal release-readiness checklist (pre-launch)

- [ ] Sync workers (Phase 6) populate the registry in real CI
- [ ] chat-service migrated to `/evaluate-v2`
- [ ] 60-prompt browser UAT executed at ≥ 92% routing-correct
- [ ] CSV cost-saved export downloads without 500
- [ ] PRIVACY_FIRST audit shows 0 cloud routes for medical/legal/finance prompts
- [ ] Demo video script recorded
- [ ] Press release reviewed by legal
- [ ] Landing page draft signed off by CEO + PM
- [ ] CHANGELOG + release notes published
