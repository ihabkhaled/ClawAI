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
