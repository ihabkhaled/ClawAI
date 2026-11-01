# Chat surface parity map

The ten orchestration surfaces and the judge/critic are surfaces over normal chat
([rule 59](../rules/59-chat-surfaces-are-one-pipeline.md), [ADR-155](../docs/13-adr/adr-155-chat-surfaces-are-one-pipeline.md)).
Walk this table before calling a chat change done.

## Shared code (a change here reaches every surface)

| Concern                                                                                             | Shared piece                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What a model sees (history, files, memory, packs, cross-thread, research, window)                   | `ChatContextGatewayManager` -> `ContextAssemblyManager`                                                                                                                                                                                                                                                                    |
| Calling a model (request shape, hold/ceiling/release, ledger, fallback, sampling)                   | `ModeExecutionGatewayManager` -> `ChatExecutionManager.callProvider`                                                                                                                                                                                                                                                       |
| The thread (ownership, context packs)                                                               | `resolveOrchestrationThread` (`utilities/orchestration-thread.utility.ts`)                                                                                                                                                                                                                                                 |
| Request fields                                                                                      | Zod fragments: `researchFields`, `attachmentFields`, `contextPackFields` (`dto/`)                                                                                                                                                                                                                                          |
| Generation-intent guard, named model, platform identity                                             | `generationRequestText` (shared-utilities), `named-model.utility.ts`, `platform-identity` block                                                                                                                                                                                                                            |
| Research evidence narration (how each page was read, `PAGE_READ`)                                   | `pageReadNarrations` via `ResearchOrchestratorManager` (AUTO + explicit modes) and `ContextAssemblyManager` (gateway path)                                                                                                                                                                                                 |
| Research (search, fetch, run; timeouts; error mapping; which providers searched; wait-before-model) | ONE gateway: `utilities/research-gateway.utility.ts` (ADR-212). Compare + the nine orchestration managers via `ResearchEnricherManager`, search-first, AUTO, explicit modes, labs/gateway context and the `web_search`/`web_fetch` tools all call it; `research-gateway-parity.spec.ts` fails on any other research client |
| `@` plugin mentions (`pluginRefs`: stored on the user turn, offered as native tools, tool loop)     | `pluginFields` DTO fragment, `pluginRefsMetadata` on each surface's user message, `ChatContextGatewayManager` -> `AssembledContext.pluginRefs` -> `callProvider` -> `PluginToolLoopManager`                                                                                                                                |
| UI request spread                                                                                   | `useOrchestrationComposer().sharedPayload` (carries `pluginRefs`)                                                                                                                                                                                                                                                          |
| UI controls                                                                                         | the chat composer's `ComposerPlusMenu` + `RichPromptTextarea` (`@` picker) in `OrchestrationPageShell` (labs), `compare/page.tsx`, `in-thread-compare-panel.tsx`                                                                                                                                                           |

## Surfaces

| Surface             | Backend manager (apps/claw-chat-service/src/modules/chat-messages/managers) | Frontend entry                                                      |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Compare Models      | `parallel-execution` (+ `compare-judge`)                                    | `app/(portal)/chat/compare/page.tsx`, `in-thread-compare-panel.tsx` |
| Consensus Mode      | `consensus-execution`                                                       | `chat/consensus` (shell)                                            |
| Escalation Chain    | `escalation-chain`                                                          | `chat/escalation` (shell)                                           |
| Repair Lab          | `answer-repair`                                                             | `chat/repair` (shell)                                               |
| Task Decomposer     | `task-decomposition`                                                        | `chat/decompose` (shell)                                            |
| Best-of-N           | `best-of-n`                                                                 | `chat/best-of-n` (shell)                                            |
| Verifier            | `verifier`                                                                  | `chat/verify` (shell)                                               |
| Pipeline Lab        | `pipeline`                                                                  | `chat/pipeline` (shell)                                             |
| Cost-Aware Ensemble | `cost-ensemble`                                                             | `chat/cost-ensemble` (shell)                                        |
| Role Pack           | `role-pack`                                                                 | `chat/role-pack` (shell)                                            |
| Judge / critic      | `judge-referee` (calls `callProvider`)                                      | inside Compare and chat                                             |

Service entry points that create threads for Compare/Consensus/Escalation: `chat-messages.service.ts`
(`resolveCompareThread`, `createConsensusMessage`, `createEscalationChainMessage`).

## Known exceptions (owned, tested for)

- **TD-044** Consensus synthesis posts to the local Ollama route and meters itself (`consensus-execution.manager.ts`).
- **TD-045** A lab has no thread before it runs, so its Context button has the pack picker but not the
  "what will be sent" / memory dialogs. Compare in a thread has all three.

- **Save proposals (ADR-168, rule 57 item 11)** Only normal chat proposes "remember this" saves:
  `contextSaveMode` lives on the create-message DTO alone (edit and regenerate re-run the same
  `handleMessageRouted` from the stored user message). Compare, in-thread Compare, Consensus, Escalation and the
  seven labs run their own managers, which never call `ContextSaveOrchestratorManager`, so a save request typed there is
  answered as plain text, and their DTOs and the frontend do not carry the field. Why: a field the backend never reads
  is a switch wired to nothing. Closing it: route those managers through the pre-filter and orchestrator, then
  restore the `contextSaveFields` fragment on their DTOs, in one change. Guard: `context-save-surfaces.dto.spec.ts`.

- **Plugin mentions (2026-10-14, plugins batch 4).** `pluginRefs` reach Compare, in-thread Compare, Consensus,
  Escalation, Best-of-N, Decompose, Pipeline, Cost-Ensemble and Role Pack through the gateway and `callProvider`;
  **Repair, Verify, the judge and the critic deliberately get no plugin tools** (they rewrite or grade an existing
  answer; `PLUGIN_TOOL_SURFACES`), and their pages show no `@` picker. Compare lanes and normal chat leave the
  streaming path for a mentioned message (tool calls need the whole response). Open: the consent card and
  `PLUGIN_*` stream events, and own MCP servers in `resolve`; the plugin-service `/api/v1/internal/plugins/*` routes now exist. If plugin-service is down a mentioned
  message answers as plain chat with a notice.

- **Media tools (2026-10-31, closed for every surface 2026-11-01).** A tool-calling chat model can decide to
  make media: `generate_image`, `generate_video`, `generate_audio` are offered as native tools, the call runs
  through ONE gateway (`utilities/media-gateway.utility.ts`, the only file that knows the image, video and audio
  routes), waits with bounded polling, and the result goes back to the SAME model as the tool result so it writes
  the reply. The cards ride on the answer as `metadata.mediaGenerations` and render under the text. One chokepoint
  (`ChatExecutionManager.callProvider` -> `MediaToolLoopManager`); a media turn is not streamed (tool calls need
  the whole response), and only a turn where the user asks to CREATE media is offered the tools
  (`asksToCreateMedia`). Models without tool calling, Ollama, and every provider outside the shared
  `modelCanCallMediaTools` set keep the router-side redirect. Three families:
  1. **One answer per call (every call may carry the tools):** normal chat, Compare lanes, in-thread Compare.
     Stored through `buildToolMetaPart` / `mediaGenerationsField`.
  2. **Many candidates (final-step rule):** Consensus, Escalation, Best-of-N, Decompose, Pipeline, Cost-Ensemble,
     Role Pack, Verify (it drafts, then checks). Candidates, tiers and sub-steps NEVER get the tools, so N
     candidates cannot each pay for the same picture. The step that produces the ONE user-visible answer calls
     `MediaFinalStepManager.finalize` once: only when the user asked to create media and the answering model can
     call the tools, one extra metered call runs the media loop on that model with the prepared answer as
     background (`context.mediaFinalStep`); the resulting `mediaGenerations` ride on the FINAL message
     (`buildMediaMetaPart(final)`) and are linked to it once saved (`linkSaved`, image, video and audio). If the
     model makes no media the orchestrated answer is kept unchanged. A candidate that says "I generated an image"
     with no tool result is stripped by the claim guard. **When the answering model cannot call tools** (Ollama,
     which is all the labs accept today, or any non-tool provider) the final step generates DIRECTLY
     (`MediaToolLoopManager.generateDirect`): the kind comes from the shared classifiers on the user's request, the
     request is the prompt, and the same plan gate, per-message budget, fallback list and Stop apply; the card
     alone is the output (no new text). Normal chat with a non-tool model is not touched: the router redirect
     already handles it, so it is never generated twice. Answering model: Best-of-N, Cost-Ensemble, Role Pack,
     Pipeline, Decompose and Verify use the run's resolved selection; Escalation the tier that finally answered;
     Consensus the first completed lane whose model can call tools. **Stop:** the whole orchestrated turn
     (candidates and final step) runs under the thread's Stop key (`MediaFinalStepManager.runScoped`), so
     `POST .../stream/:threadId/cancel` returns `cancelled:true`; the final step then saves "Generation stopped at
     your request." and makes no media, and an in-flight media job is cancelled at the media service. Candidate
     model calls already in flight cannot be aborted (no signal reaches `callProvider`); they finish and are
     discarded.
  3. **Rewrite or grade an existing answer:** Repair keeps the `mediaGenerations` of the message it repairs
     (`readStoredMediaGenerations(source.metadata)`), never offers tools and never invents or drops a card; the
     judge and critic are never offered tools (they are not in `MEDIA_TOOL_SURFACES`), and a judge revision keeps
     the answer's `mediaGenerations` (`chat-execution.manager.ts`). Verify has no source message (its DTO carries
     text only), so there is nothing to preserve there; it is family 2.
     Budget: 3 generations per user message across the whole orchestration, 2 calls per answer; Compare lanes wait as
     long as normal chat. Stop: single-lane chat and the one final step own the thread's Stop key, abort the wait and
     cancel the job at the media service; Compare lanes (side by side) are bounded by the poll cap. Guards:
     `media-tool-surfaces.spec.ts`, `media-final-step.spec.ts`.
     Remaining, with the reason: **Threads** are published by their own service, not by a chat-service surface, so they
     are outside this loop (not verified here). No lab keeps an exception. The audio card is still skipped in the thread UI. The final step is an
     EXTRA model call on a media turn (the price of one tool-offering call instead of N).

- **Loose composer controls (closed 2026-10-14).** Compare, in-thread Compare and the seven labs now render the same
  grouped `ComposerPlusMenu` as normal chat plus the research chip; the loose `FileAttachmentPicker`,
  `PromptLibraryButton`, `ResearchToggle` and `OrchestrationContextButton` are gone from them. A surface with no
  thread yet passes `draftContextPacks` and gets the pack picker (the choice rides with the run); the what-is-sent /
  memory / preview rows stay thread-only (TD-045). Guard: `chat-surface-layout-contract.test.ts`.

- **Turn into public Thread** is a thread-level action in the normal chat header menu (`chat-thread-header-menu.tsx`
  -> `ThreadCreateDialog`), not a message mode: the labs have no saved thread to publish, so they do not carry it.
  The same form (`useThreadGenerationForm`) backs the `/threads` portal, so the two cannot drift.

## Guards

`orchestration-parity.spec.ts` (chat-service; includes `pluginFields` on every DTO and `pluginRefsMetadata` in every
manager), `orchestration-page-shell-recorder.test.tsx`, `compare-page.test.tsx`,
`in-thread-compare-panel.test.tsx`, `chat-surface-layout-contract.test.ts` (frontend). Skill:
[propagate-a-chat-change-to-every-mode](../skills/propagate-a-chat-change-to-every-mode.md).
