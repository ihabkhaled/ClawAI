---
id: final-model-preservation
title: Final-model preservation (router-side)
category: ollama-governance
level: mandatory
depends_on:
  - search-tool-use/router-final-model-preservation
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - ai-platform-team
---

# Final-model preservation (router-side)

## Purpose

When the routing service selects a model to handle a message that involves tool-use (search, fetch, scrape, clone), the USER-REQUESTED model — if any — MUST remain the final answerer.

## Strict rules

- **MUST** record `forcedFinalModel` on the routing decision when the user explicitly names a model.
- **MUST** allow tool-use models to run as helpers, but the final synthesis uses `forcedFinalModel`.
- **MUST** fall back gracefully when the requested model is unhealthy — but record the substitution in the decision.
- **MUST NOT** silently swap the requested model for the router's preferred model.

## Validation checklist

- [ ] `forcedFinalModel` respected in decision
- [ ] Tool helpers allowed separately
- [ ] Substitution logged when fallback occurs

## Quality gate

| Check                               | Blocker? | Evidence               |
| ----------------------------------- | -------- | ---------------------- |
| Decision log shows preserved model  | yes      | RoutingDecision record |
| Substitution logged when it happens | yes      | RoutingDecision record |

## Definition of done

1. Preservation enforced.
2. Substitution transparent.

## References

- `search-tool-use/router-final-model-preservation.md`
