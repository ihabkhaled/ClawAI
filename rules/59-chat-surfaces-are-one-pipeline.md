# 59 - Every chat surface is one pipeline: a change to normal chat reaches all of them

**Status:** active - **Owner:** chat - **Introduced:** 2026-10-03 - **ADR:** [ADR-155](../docs/13-adr/adr-155-chat-surfaces-are-one-pipeline.md)
**Skill:** [skills/propagate-a-chat-change-to-every-mode.md](../skills/propagate-a-chat-change-to-every-mode.md)
**Map:** [context/chat-surface-parity-map.md](../context/chat-surface-parity-map.md)

Normal chat is the product. Compare Models, Consensus Mode, Escalation Chain, Repair Lab,
Task Decomposer, Best-of-N Generation, Verifier, Pipeline Lab, Cost-Aware Ensemble, Role Pack,
and the judge / critic are **surfaces over the same pipeline**, never copies of it. Same
context, same uploads, same tools, same buttons, same billing chokepoint. The owner's words
(2026-10-03): anything made for normal chat must propagate to all of them, always.

## The rules

1. **No private pipeline.** A surface asks "what should this model see?" through
   `ChatContextGatewayManager` and calls a model through `ModeExecutionGatewayManager`
   (which is `ChatExecutionManager.callProvider`, the chat chokepoint). It never builds its
   own history, file, memory, pack, research or request-shape code and never posts to
   `/api/v1/ollama/generate`.
2. **One thread resolver.** A surface obtains its thread with `resolveOrchestrationThread`
   (`utilities/orchestration-thread.utility.ts`): ownership-checked when a `threadId` is
   given, and a new thread carries `contextPackIds`. No `chatThreadsRepository.create(` in a
   manager.
3. **One request fragment per chat feature.** What chat's message DTO accepts and a surface
   can express is a shared Zod fragment spread by every surface DTO: `researchFields`,
   `attachmentFields`, `contextPackFields`. A new fragment is added to ALL ten DTOs in the
   same commit; the parity spec fails otherwise.
4. **One composer.** The frontend surfaces take their input controls from the chat composer's
   parts: attach, voice/video, research, Context button, Prompt library, Enter-to-send
   (`RichPromptTextarea`). The labs get them from `OrchestrationPageShell` and one hook
   (`useOrchestrationComposer`); every request fragment a lab shares with chat travels in ONE
   spread, `composer.sharedPayload`. A new chat control is added to the shell and the compare
   surfaces in the same commit, never to the chat composer alone.
5. **A chat change is not done until its propagation is.** Before calling a chat change done,
   walk [the parity map](../context/chat-surface-parity-map.md): for each of the ten surfaces
   say "applies automatically (shared code)", "applied here (path)", or "not applicable
   because ..." in the commit body or the PR. "I only changed chat" is a prohibited sentence.
6. **Exceptions are listed, owned and tested for.** The only raw provider call left is
   Consensus synthesis (a local reducer that meters itself): TD-044. Preview-context and
   memory dialogs need a thread, so labs (which create their thread on run) get the pack
   picker but not those two dialogs: TD-045. Anything else is a defect.
7. **The guard test is the mechanism.** `apps/claw-chat-service/src/modules/chat-messages/__tests__/orchestration-parity.spec.ts`
   reads the sources and fails when a surface grows its own thread creation, a raw provider
   call, skips a gateway, or its DTO misses a shared fragment. The frontend side is asserted in
   `orchestration-page-shell-recorder.test.tsx`, `compare-page.test.tsx` and
   `in-thread-compare-panel.test.tsx`. Adding a surface means adding it to those lists.

## What it costs when ignored

Seven labs sent a raw string to a model with no history or files; Compare, Consensus and
Escalation carried three copies of one builder; the judge judged answers without the question;
the labs trusted a caller-supplied `threadId` with no ownership check and could not carry a
context pack, while Compare used a bare textarea with no Enter-to-send. Every one of those was
"added to chat, forgotten elsewhere".

Related: [rules/20](20-i18n-and-user-facing-messages.md) (a new control's text is 13 locales),
[rules/40](40-chat-surface-layout-and-composer.md) (composer layout),
[rules/42](42-attachment-understanding.md) (attachments), [rules/57](57-memory-and-context-pack-integrity.md) (packs and memory).
