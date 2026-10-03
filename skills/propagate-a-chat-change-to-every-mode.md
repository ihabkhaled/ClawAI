# Skill - Propagate a chat change to every mode

**Use when:** you add, change or fix ANYTHING in normal chat - a button, an upload type, a tool,
a context source, a routing or detection rule, a billing step, a prompt block, a DTO field.
**Rule:** [rules/59](../rules/59-chat-surfaces-are-one-pipeline.md) - **ADR:** [ADR-155](../docs/13-adr/adr-155-chat-surfaces-are-one-pipeline.md)
**Map:** [context/chat-surface-parity-map.md](../context/chat-surface-parity-map.md)
**Related:** [give-a-surface-the-same-context-as-chat.md](give-a-surface-the-same-context-as-chat.md)

The ten surfaces: Compare Models, Consensus Mode, Escalation Chain, Repair Lab, Task Decomposer,
Best-of-N, Verifier, Pipeline Lab, Cost-Aware Ensemble, Role Pack - plus the judge and critic.

## 1. Locate your change in the pipeline (2 minutes)

| Your change lives in                                                                                             | It reaches the surfaces when               | You must also                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `ChatContextGatewayManager` / `ContextAssemblyManager` (history, files, memory, packs, research)                 | automatically                              | nothing                                                                                     |
| `ChatExecutionManager.callProvider` (request shape, billing, fallback, sampling)                                 | automatically (the mode gateway calls it)  | nothing                                                                                     |
| the platform identity block, planner or detectors in shared-utilities                                            | automatically for any path that reads them | confirm the surface reads `generationRequestText` / the identity block                      |
| chat-service message path only (`chat-messages.service.ts` pre-steps: named model, save intent, attachment gate) | NO                                         | apply to the surface entry points listed in the map, or document why not                    |
| a DTO field on `create-message.dto.ts`                                                                           | NO                                         | add a shared fragment and spread it in all ten DTOs                                         |
| a composer control (`composer-toolbar.tsx`)                                                                      | NO                                         | add it to `orchestration-page-shell.tsx`, `compare/page.tsx`, `in-thread-compare-panel.tsx` |
| a request value the UI sends                                                                                     | NO                                         | put it in `useOrchestrationComposer` and its `sharedPayload`; Compare's hook spreads it too |

## 2. Make it shared, not copied

- Backend: extend a gateway / fragment / utility. Never paste the logic into a manager.
- Frontend: reuse the chat component (`PromptLibraryButton`, `ComposerContextPackPicker`,
  `FileAttachmentPicker`, `VoiceVideoRecorder`, `ResearchToggle`, `RichPromptTextarea`) or a draft
  variant of its hook (`useDraftContextPacks` is the pattern for a surface with no thread yet).
- A thread-bound piece (preview context, memory dialog) cannot show before a lab run creates its
  thread; say so in the map instead of faking it.

## 3. Extend the guard

Add the new thing to `orchestration-parity.spec.ts` (a new fragment goes in `SHARED_FRAGMENTS`, a
new surface in `LAB_MANAGERS` / `LAB_DTOS`) and to the frontend parity tests. A rule with no failing
test is a wish.

## 4. Prove it (cheap, scoped)

```bash
cd apps/claw-chat-service && npx vitest run src/modules/chat-messages/__tests__/orchestration-parity.spec.ts
cd apps/claw-frontend    && npx vitest run src/components/chat/orchestration src/app/\(portal\)/chat/compare \
                                         src/components/chat/__tests__/in-thread-compare-panel.test.tsx
```

Then one API call per surface class (curl a lab and Compare with your new field) and read the log
line proving the branch ran; one headless Playwright pass of a lab page and Compare at 390 and
1366 for a UI change (rules/49).

## 5. Say it in the commit

One line per surface group: "applies via shared gateway", "applied in <path>", or "n/a because ...".

## Definition of done

- [ ] The change is in shared code, or in every entry the map lists.
- [ ] The parity spec and the frontend parity tests cover it and pass.
- [ ] The map, the rule's exception list and the debt register are current.
- [ ] 13 locales if text was added (rules/20).
- [ ] The commit body names how each surface group gets it.
