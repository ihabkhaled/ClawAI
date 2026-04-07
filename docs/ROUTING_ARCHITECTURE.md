# ClawAI Routing Architecture & Anti-Hallucination Audit

**Date**: 2026-04-07
**Scope**: Ollama router, routing modes, anti-hallucination, validation, policies, health, observability

---

## 1. Current-State Assessment

### Routing Flow
```
message.created event
  → routing-service handleMessageCreated()
  → extract: messageId, threadId, content, routingMode, forcedProvider, forcedModel
  → build RoutingContext (message, health caches, mode, forced fields)
  → RoutingManager.evaluateRoute(context)
    → switch(mode):
      AUTO → OllamaRouterManager.route() → fallback to heuristic
      MANUAL_MODEL → use forcedProvider/forcedModel
      LOCAL_ONLY → hardcoded local-ollama/tinyllama
      PRIVACY_FIRST → local if healthy, else Anthropic
      LOW_LATENCY → hardcoded OpenAI/gpt-4o-mini
      HIGH_REASONING → hardcoded Anthropic/claude-opus-4
      COST_SAVER → local if healthy, else cheapest cloud
  → store RoutingDecision in DB
  → publish message.routed event
```

### What's REAL
- 7 routing modes with deterministic behavior
- Ollama-assisted AUTO routing (calls local model for decisions)
- Anti-hallucination: temperature=0, Zod schema validation, provider allowlist
- Health-aware routing (connector + runtime health caches)
- Full decision persistence (provider, model, confidence, reasons, privacy/cost class)
- Comprehensive structured logging
- Fallback chain computation
- Router model resolution from Ollama role assignments

### What's MISSING/BROKEN

| Issue | Severity | Impact |
|-------|----------|--------|
| Routing policies never evaluated | P0 | Policies are decorative CRUD |
| No post-decision validation | P0 | Stale health = route to dead provider |
| RoutingContext dead fields | P1 | threadHistory, memory, contextPacks never populated |
| Health cache can be stale | P1 | No TTL, no refresh mechanism |
| forcedProvider not in HTTP API | P1 | Dead code in evaluate endpoint |
| Only first fallback persisted | P2 | Full chain lost in DB |
| Confidence scores are arbitrary | P2 | No real calculation basis |

---

## 2. Anti-Hallucination Controls (Current)

| Control | Status | Assessment |
|---------|--------|------------|
| Temperature = 0 | REAL | Strongest control — deterministic output |
| Response length limit (200 tokens) | REAL | Prevents verbose hallucination |
| JSON regex extraction | REAL | Finds JSON object in response |
| Zod schema validation | REAL | Validates structure (provider, model, confidence, reason) |
| Provider allowlist (VALID_PROVIDERS) | REAL | Blocks hallucinated providers |
| Health-aware validation | REAL | Blocks unhealthy providers |
| Timeout (configurable, default 5s) | REAL | Kills slow router, falls back to heuristic |
| Graceful fallback to heuristic | REAL | Any failure → handleAutoHeuristic |

### Missing Anti-Hallucination Controls

| Control | Impact | Remediation |
|---------|--------|-------------|
| Model existence validation | Router can return non-existent model names | Add model registry check |
| Capability matching | Router may route vision task to text-only model | Add modality check |
| Stuck-route detection | Router may always pick same provider | Add diversity logging/alerting |
| Contradicted health data | Cache says healthy, actual call fails | Add per-call health re-check |
| Policy violation check | Router ignores user-defined policies | Wire policies into validation |

---

## 3. Router Contract

### Input (RoutingContext)
```typescript
{
  message: string;                          // User's message (required)
  threadId?: string;                        // Thread context (optional)
  threadHistory?: string[];                 // DEAD CODE — never populated
  memory?: string[];                        // DEAD CODE — never populated
  contextPacks?: string[];                  // DEAD CODE — never populated
  connectorHealth?: Record<string, boolean>; // Provider health cache
  runtimeHealth?: Record<string, boolean>;   // Runtime (Ollama) health cache
  userMode?: RoutingMode;                    // AUTO | MANUAL_MODEL | LOCAL_ONLY | etc.
  forcedModel?: string;                      // For MANUAL_MODEL mode
  forcedProvider?: string;                   // For MANUAL_MODEL mode
}
```

### Output (RoutingDecisionResult)
```typescript
{
  selectedProvider: string;        // "local-ollama" | "OPENAI" | "ANTHROPIC" | etc.
  selectedModel: string;           // "tinyllama" | "gpt-4o-mini" | etc.
  routingMode: RoutingMode;        // Which mode was used
  confidence: number;              // 0.0-1.0
  reasonTags: string[];            // ["auto", "ollama_router", "local_available"]
  privacyClass: string;            // "local" | "cloud" | "unknown"
  costClass: string;               // "free" | "low" | "medium" | "high"
  fallbackChain: FallbackEntry[];  // [{provider, model}, ...]
}
```

---

## 4. Implementation Plan

### Phase R1: Wire Routing Policies into Decision Logic (P0)

**Goal**: Make policies actually influence routing decisions.

Read active policies before evaluateRoute. If a policy matches the current context:
- Override the default mode behavior
- Apply policy-specific constraints (e.g., "never use OPENAI", "always prefer local")
- Add policy ID to reason tags for auditability

### Phase R2: Post-Decision Health Re-Validation (P0)

**Goal**: Verify the chosen provider is ACTUALLY reachable before publishing message.routed.

After evaluateRoute returns, do a quick health ping to the selected provider. If it fails, try the next in fallback chain. Only publish message.routed once a viable provider is confirmed.

### Phase R3: Add forcedProvider to HTTP API (P1)

**Goal**: Let the evaluate endpoint accept forcedProvider.

Add `forcedProvider` to `evaluateRoute.dto.ts` and wire into context.

### Phase R4: Store Full Fallback Chain (P2)

**Goal**: Persist the entire fallback chain, not just the first entry.

Change RoutingDecision schema to store `fallbackChain Json` instead of `fallbackProvider`/`fallbackModel`.

---

## 5. Signs the Router is Fake/Broken/Stuck

1. Every message routes to the same provider/model regardless of content
2. Confidence is always the same number (e.g., always 0.7)
3. Ollama router always times out (all decisions are heuristic fallback)
4. reasonTags never includes "ollama_router" (router is never succeeding)
5. Health cache hasn't been updated in >10 minutes
6. Policies exist but routing decisions ignore them
7. RoutingContext.memory/threadHistory/contextPacks are always empty
8. Manual override doesn't actually change the selected model
9. Fallback chain is always empty (no alternatives computed)
10. Same fallback chain for every decision (not context-sensitive)

---

## 6. Routing Quality Metrics

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Ollama router success rate | Count decisions with "ollama_router" in reasonTags / total AUTO decisions | >70% |
| Average routing latency | Time from message.created to message.routed | <3s |
| Fallback usage rate | Count usedFallback=true messages / total | <15% |
| Provider diversity | Unique providers used in last 100 decisions | >2 |
| Confidence distribution | Histogram of confidence values | Spread across 0.5-1.0, not single value |
| Health cache freshness | Time since last CONNECTOR_HEALTH_CHECKED event | <5 minutes |
| Policy compliance | Decisions that respect active policies / total | 100% (once wired) |

---

## 7. Release Gates

| Gate | Status |
|------|--------|
| Ollama router functional (calls Ollama, validates, falls back) | PASS |
| Anti-hallucination (temp=0, Zod, provider allowlist, timeout) | PASS |
| Health-aware routing | PASS (but stale cache risk) |
| Routing policies evaluated | FAIL (decorative) |
| Post-decision health validation | FAIL (trusts cache) |
| Full fallback chain persisted | FAIL (only first entry) |
| forcedProvider in HTTP API | FAIL (dead code) |
| Comprehensive test coverage | FAIL (happy paths only) |
