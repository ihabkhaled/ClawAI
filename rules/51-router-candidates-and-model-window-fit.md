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

## Added 2026-09-19 (ADR-103)

6. **Every AUTO answer names its router.** The cloud router sets
   `routerModel` from the attempt whose decision was used
   (`routerModelFromAttempts`). A new routing path that returns a decision
   without it hides who routed.
7. **Never hard-code a model that writes for the user.** File writers are the
   `FILE_WRITER` assistant role. A new helper model gets a role, not a
   constant.
8. **File intent needs a file word.** Change `detectFileIntent` only together
   with its case table (`file-intent.utility.spec.ts`), and add any new false
   positive to it first.
