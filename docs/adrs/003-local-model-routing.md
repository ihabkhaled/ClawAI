# ADR-003: Local Model as Router/Judge

## Status
Accepted

## Context
Claw connects to multiple AI providers. We need a decision engine to route prompts to the best model based on cost, latency, privacy, and capability.

## Decision
Use a local model (via Ollama) as the routing/judge engine. The local model evaluates each prompt and decides which provider/model should handle it.

## Key Principle
The local model is the **decision engine**, not automatically the final execution engine. The router outputs a structured decision (provider, model, confidence, reason) and the system executes against the selected provider.

## Routing Modes
- AUTO — local router decides
- MANUAL_MODEL — user forces specific model
- LOCAL_ONLY — only use local models
- PRIVACY_FIRST — prefer local, avoid external for sensitive data
- LOW_LATENCY — fastest model
- HIGH_REASONING — strongest reasoning model
- COST_SAVER — cheapest adequate model

## Consequences
- Users can run Claw offline with local-only mode
- Privacy-sensitive prompts stay local
- Cost optimization through intelligent routing
- Requires a local model to be installed for AUTO mode
- Manual override always available as fallback
