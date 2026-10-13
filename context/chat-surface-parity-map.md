# Chat surface parity map

The ten orchestration surfaces and the judge/critic are surfaces over normal chat
([rule 59](../rules/59-chat-surfaces-are-one-pipeline.md), [ADR-155](../docs/13-adr/adr-155-chat-surfaces-are-one-pipeline.md)).
Walk this table before calling a chat change done.

## Shared code (a change here reaches every surface)

| Concern                                                                           | Shared piece                                                                                                               |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| What a model sees (history, files, memory, packs, cross-thread, research, window) | `ChatContextGatewayManager` -> `ContextAssemblyManager`                                                                    |
| Calling a model (request shape, hold/ceiling/release, ledger, fallback, sampling) | `ModeExecutionGatewayManager` -> `ChatExecutionManager.callProvider`                                                       |
| The thread (ownership, context packs)                                             | `resolveOrchestrationThread` (`utilities/orchestration-thread.utility.ts`)                                                 |
| Request fields                                                                    | Zod fragments: `researchFields`, `attachmentFields`, `contextPackFields` (`dto/`)                                          |
| Generation-intent guard, named model, platform identity                           | `generationRequestText` (shared-utilities), `named-model.utility.ts`, `platform-identity` block                            |
| Research evidence narration (how each page was read, `PAGE_READ`)                 | `pageReadNarrations` via `ResearchOrchestratorManager` (AUTO + explicit modes) and `ContextAssemblyManager` (gateway path) |
| UI request spread                                                                 | `useOrchestrationComposer().sharedPayload`                                                                                 |
| UI controls                                                                       | `OrchestrationPageShell` (labs), `compare/page.tsx`, `in-thread-compare-panel.tsx`, from the chat composer's components    |

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

- **Loose composer controls (rule 40 item 24, follow-up)** Normal chat has ONE round `+` menu (`ComposerPlusMenu`:
  Attach / Context / Tools). Three surfaces still render the old loose buttons: **Compare**
  (`app/(portal)/chat/compare/page.tsx`), **in-thread Compare** (`in-thread-compare-panel.tsx`) and
  **OrchestrationPageShell** (the seven labs, `orchestration/orchestration-page-shell.tsx`).
  What remains: `FileAttachmentPicker`, `PromptLibraryButton` and `ResearchToggle` on all three, plus
  `ComposerContextControls` on in-thread Compare.
  Why not done: the menu needs the research-provider query, `onInsertPrompt` and the draft wired from each
  surface, and each one does that on its own (a lab has no thread, so `threadId` is null there). Moving them is a
  per-surface change with its own tests, not a small safe one. Follow-up: one batch that renders
  `ComposerPlusMenu` in all three and deletes the loose imports.

- **Turn into public Thread** is a thread-level action in the normal chat header menu (`chat-thread-header-menu.tsx`
  -> `ThreadCreateDialog`), not a message mode: the labs have no saved thread to publish, so they do not carry it.
  The same form (`useThreadGenerationForm`) backs the `/threads` portal, so the two cannot drift.

## Guards

`orchestration-parity.spec.ts` (chat-service), `orchestration-page-shell-recorder.test.tsx`,
`compare-page.test.tsx`, `in-thread-compare-panel.test.tsx` (frontend). Skill:
[propagate-a-chat-change-to-every-mode](../skills/propagate-a-chat-change-to-every-mode.md).
