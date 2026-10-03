# ADR-155 - Every chat surface is one pipeline

**Status:** Accepted - **Date:** 2026-10-03 - **Owner direction:** chat, 2026-10-03

## Context

ClawAI has normal chat plus ten orchestration surfaces (Compare Models, Consensus Mode,
Escalation Chain, Repair Lab, Task Decomposer, Best-of-N, Verifier, Pipeline Lab, Cost-Aware
Ensemble, Role Pack) and a judge/critic. ADR-116 and ADR-118 moved context assembly and the
model call onto shared gateways. An audit on 2026-10-03 found what was still copied:

- seven lab managers each had their own `resolveThreadId` (no ownership check on a supplied
  `threadId`; no way to carry a context pack);
- Compare's page used a bare `Textarea` (no Enter-to-send, no IME guard) and had no Context
  button or Prompt library; the labs had neither;
- the Compare DTO redeclared the research fields instead of spreading the shared fragment;
- Consensus synthesis posts straight to the local Ollama route.

## Decision

1. Chat is the one pipeline; surfaces never copy it (rule 59).
2. One thread resolver (`resolveOrchestrationThread`), one DTO fragment per shared feature
   (`researchFields`, `attachmentFields`, `contextPackFields`), one frontend request spread
   (`useOrchestrationComposer().sharedPayload`).
3. Labs and Compare get the chat composer's controls: Context (packs), Prompt library, attach,
   voice/video, research, Enter-to-send. A lab has no thread until it runs, so its Context button
   holds the pack choice client-side and sends `contextPackIds`; the backend stores them on the
   thread it creates, which is where the context gateway already reads them.
4. A source-reading guard spec (`orchestration-parity.spec.ts`) plus frontend parity tests make
   drift a red test. Listed exceptions: TD-044 (Consensus synthesis raw local call, a billing
   decision), TD-045 (preview-context and memory dialogs need a thread).

## Consequences

- Adding a chat feature has a mandatory propagation walk
  ([skill](../../skills/propagate-a-chat-change-to-every-mode.md)); the parity map names every entry point.
- Supplying someone else's `threadId` to a lab is now a 403 (it was silently accepted).
- No schema change; no new env var; no new route.
