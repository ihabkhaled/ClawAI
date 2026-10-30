# ADR-199: Aggregator models are priced, and the low plans stop short of the dearest classes

**Status:** Accepted
**Date:** 2026-10-31

## Context

Production had 638 exposed models; 511 had no price (OpenRouter 348, Hugging Face 88, NVIDIA NIM 67, Groq 4,
AI Horde 4). An unpriced model is refused on send (fail closed), so on every plan, Pro included, those models
showed "Not on your plan" (ADR-198). Separately every paid plan allowed all five cost classes, so a $5
Starter plan could reach models that cost $30 per million output tokens.

## Decision

1. **Price every aggregator model** with seed v14. Source order: the provider's published price for that exact
   id (OpenRouter's public list), the provider's official list price (Cohere, MiniMax, AI21, Mistral), the same
   model on OpenRouter, then a size tier marked ESTIMATE. Class follows the output price: 0 FREE, under $1
   CHEAP, under $6 STANDARD, under $40 PREMIUM, else ULTRA. A model free to the platform is priced 0/0 and
   classed FREE. Variable-price routers and non-chat models stay unpriced on purpose.
2. **Low plans stop short**: Free and Starter allow FREE, CHEAP, STANDARD; Plus adds PREMIUM; Pro, Team, Scale and
   Unlimited keep all five. A guarded migration moves only a plan still on the shipped all-five list, so an
   administrator's edit is never overwritten.

## Consequences

- Production gains 495 callable models on its next deploy; Free sees only those under $6 output.
- Estimates can be wrong: they are labelled in the ledger and a synced or admin price replaces them.
- Starter users lose PREMIUM and ULTRA models they could pick before; the picker shows them dimmed.

Ledger: [model-price-ledger-2026-10-31](../03-architecture/model-price-ledger-2026-10-31.md).
