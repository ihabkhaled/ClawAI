# ADR-220: A Thread made from a chat is sourced from the whole chat

**Status:** Accepted

**Date:** 2026-11-22

Builds on [ADR-218](adr-218-turn-intent-is-decided-by-a-model-in-any-language.md). Spec: [Threads product spec](../02-business-product/clawai-threads-product-spec.md). Guide: [thread-generation service](../04-backend/service-guide-thread-generation.md).

## Context

Two production failures (2026-11-22). (1) The owner opened "Create a public Thread" on a long chat and typed an instruction in the topic box ("this topic is huge … never concise"). The box went to every model as the article topic and research searched it, so the Thread was about "writing gigantic threads"; a long chat was also cut to its first message plus the newest half, each message clipped to 1,500 characters. (2) Generation failed with `THREAD_MODEL_UNKNOWN` for a fallback `NVIDIANIM/nvidia/ai-synthetic-video-detector` the user never picked: the frontend took backup models from the general model list, and the start check rejected the whole run for one bad backup.

## Decision

1. **The chat is the source; the box is author instructions.** The pipeline passes `sourceConversation` and `authorInstructions`. A planning call reads both, in any language, and names the subject and search queries before research. A failed planner never fails the job (research then searches the box and the chat).
2. **The chat is fitted, never head-cut.** Duplicate regenerated answers are kept once, every turn stays in order with more room for the owner's and newer turns, long messages keep beginning and end, a note says what was left out, and the chat is fitted to each role model's window before the call. Attachment text of chat turns is part of the snapshot.
3. **"Never concise" is honoured within the output ceiling** (author calls stay capped at 8,192 output tokens, raised to 32,768 on a cut-off reply; unchanged).
4. **Backups never block a run.** The frontend picks backups only from models threads-service lists as available; threads-service `prepareStart` drops a backup that is not in the catalog, not on the plan or unpriced (logged). A bad primary pick is still refused.

## Consequences

- One extra small planning call per generation.
- Retry still validates stored backups strictly (the retry API cannot drop them).
- Reversible per item; no schema change.
