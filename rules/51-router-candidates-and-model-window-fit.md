# Rule 51 — Router candidates come from admin exposure; every prompt fits its model

**Why**: see [ADR-100](../docs/13-adr/adr-100-router-candidates-and-per-model-context-fit.md).
In production, AUTO answered with Gemini almost every time, the research
planner never ran, 156 of 175 catalog models had no context window, and an 8k
model was sent a 16.7k-token prompt.

## Rules

1. **Never filter router candidates on `ACTIVE` alone.** Candidates are the
   chat models an admin exposed, filtered by connector health and the user's
   plan. `ACTIVE` only decides the order.
2. **Never call ollama-service for a hosted model.** A provider of
   `OLLAMA_CLOUD` means ollama.com with the connector key. Production has no
   ollama-service.
3. **Never keep a second context-window table.** The only one is
   `knownContextWindow` in `@claw/shared-utilities`, and a provider-reported
   value always beats it.
4. **Every fixed-size prompt source gets a window share:** research, files,
   context packs and memories. A new source added to the prompt must get a
   share, and a case in `context-assembly-window-fit.spec.ts`.
5. **Never label a `length` stop "context window full"** unless the prompt
   actually filled the window. An output cap is the usual cause.

## Check it live

- **Router:** `docker logs claw-routing-service | grep resolveEligibleDeployments`
  should show `eligible=30 providers=` naming more than one provider.
- **Planner in production:** `grep "Ollama Cloud"` in the chat-service logs.
  There must be no `ollama-service ... fetch failed` from `ResearchGateService`.
