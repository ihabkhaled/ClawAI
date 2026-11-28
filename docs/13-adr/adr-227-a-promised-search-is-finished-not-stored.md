# ADR-227: A promised search is finished, not stored as the answer

Status: Accepted (2026-11-28) · Owner order: "some AI models … respond with 'I will search xxxx', then the response
stopped … it needs to keep listening … one message for 'I will search' and one that keeps streaming until the search,
analysis and answer are ready."

## Context

Normal chat offers no web tool to the answering model. Three things then went wrong:

1. A model that replied "I will search for that now." had that sentence stored as its final answer. Nothing searched.
2. A model that asked for a web tool anyway (`web_search`, `browser.search`, …) had the call dropped
   (`extractNativeToolCalls` returns nothing without a catalog), and with no text the turn failed as an empty reply.
3. Some models write the tool request as text (`<tool_call>{…}</tool_call>`, a JSON object, leaked `to=browser.search`),
   which the user saw as the answer.

Two related gaps from the same report: a follow-up forgot files sent more than three uploads ago (and every earlier
video), and the planner and council had no idea of today's date (a sub-question was pinned to 2025).

## Decision

1. **Detect** (`SearchContinuationManager.inspect`, any language, rule 67): a web-tool call the model made without a
   catalog (`LlmResponse.requestedTools`), or web-tool markup in a short reply, is certain. Otherwise a short (≤ 800
   characters), uncited reply that does not end with a question goes to ONE judge call through the research gate's
   planner chain, with an 8 s budget; no answer in time keeps the reply. Generated media, plan notices and stopped
   replies are never continued.
2. **Continue, at most once per turn** (`ChatMessagesService.finishPromisedSearch`):
   - the promise is stored as its own assistant message with `metadata.searchContinuation = {status: 'pending', query}`
     (bare tool markup is not stored), and a `search_continuation` stream frame tells the page;
   - when the user sent the turn with research on (`metadata.researchMode`, new) and the plan includes research, one
     engine search runs (`ResearchOrchestratorManager.searchPromised`: depth 2, narrated, stoppable, no planner); its
     sources are merged into the user message's stored research, so they are fitted, numbered, linked and shown like
     any research;
   - the model is asked again with a note: sources found (answer now, cite, do not promise again), nothing found
     (say so), or web off / not in plan (answer from knowledge, say it could not search, never call it current);
   - the answer is stored as a second message; the promise becomes `status: 'done'`.
3. **Promise messages leave later prompts** (`ContextAssemblyManager.assemble` filters them): they carry no
   information and would break role alternation.
4. **A plan without research** that the user sent with research on gets `SEARCH_NOT_AVAILABLE_NOTE` on the first
   call too, so a model never presents remembered facts as "latest news".
5. **The page keeps waiting** (`use-thread-detail.ts`): a pending promise is not the end of the turn; a reload during
   the search re-arms the wait like an unanswered question; the frame clears the live text so the answer streams fresh.
6. **Everything earlier stays known**: up to 12 earlier files (was 3), an earlier video as its transcript only
   (`earlierVideoAsTranscript`, no frames, no helper cost), and each earlier answer's sources listed after it in later
   prompts (`earlierSourcesBlock`, ≤ 8 lines, sanitised, counted in the history budget).
7. **Every planning prompt states today's date** (`currentDateLine`: planner, council, gap check, replan).

## Consequences

- A promise costs one extra judge call (only for short uncited replies), one search and one more answer call, all
  through the usual chokepoints and meters. Paid search providers keep their once-per-turn rule.
- Measured locally: a model forced to only promise ended with two messages, the second answering with current prices.
- Limits: Compare, Consensus, Escalation, the labs and Runtime V2 do not continue a promise yet (rule 59 gap; Runtime
  V2 has its own `isUnfulfilledIntent` nudge). The judge reads the reply only, not the model's reasoning. The planner
  may still add a URL the user never wrote (found by the 2,415-case decision set; tracked in the plan).
