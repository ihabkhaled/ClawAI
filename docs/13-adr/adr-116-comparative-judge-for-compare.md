# ADR-116 — Compare's judge scores every lane in one comparative call

## Status

Accepted

## Context

Compare (`/chat/compare` and the in-thread Compare panel) let a user run the
same prompt against 2-5 models side by side, then judge each answer with an
LLM referee. That referee (`JudgeRefereeManager.evaluate`) was designed for
single-answer review — verify a chat turn, accept/revise/escalate — and
Compare reused it by calling it **once per lane**, independently.

That meant every lane's score came from its own call, with its own prompt, its
own randomness and its own calibration. A 7/10 on lane A and a 7/10 on lane B
were two separate opinions that happened to produce the same number; nothing
guaranteed they meant the same thing. The "best response" badge picked
whichever call had been more generous, not whichever answer the judge actually
preferred when it could see both. Worse, position and framing differences
between calls could tilt a comparison without either answer being better.

A judge that ranks candidates has to see them together, on one scale, in one
pass — the same reason a judging panel is shown all the entries before scoring
any of them, not asked to grade contestant 1 in the morning and contestant 4
after lunch.

## Decision

Compare's judge is now **one call that ranks every completed lane together**
(`CompareJudgeManager.judge`), replacing the per-lane `evaluate` loop in
`ParallelExecutionManager`. The single-lane `JudgeRefereeManager.evaluate`
stays exactly as it was for every other mode (chat, consensus, escalation) —
this only changes Compare.

1. **Anonymised, shuffled presentation.** Each completed lane is relabelled
   A, B, C… in an order produced by `buildLaneShuffle(runId, laneIndices)`, a
   Fisher-Yates shuffle seeded by SHA-256 of `runId:step` — deterministic per
   run, not `Math.random()`. The mapping (`CompareJudgeShuffle`) is recorded on
   the verdict, so a label can always be unshuffled back to its lane
   (`laneIndexForLabel`). Without this, a judge that always favours the first
   candidate it reads reproduces the order the user happened to select models
   in.

2. **One shared scale, one structured reply.** The judge returns
   `{ ranking, scores, rationale }` on a 0-10 scale, parsed by
   `parseCompareJudgeOutput` against a strict Zod schema **and** the
   cross-field invariants: every shown label appears exactly once in `ranking`
   and exactly once in `scores`, and the ranking never contradicts the scores
   (a later-ranked label must never outscore an earlier one). Any violation —
   including prose instead of JSON — returns `null`, never a best-effort guess.

3. **Failure is a verdict, never a fake winner.** `CompareJudgeVerdictStatus`
   is `RANKED | UNAVAILABLE | SKIPPED`. Only `RANKED` carries lanes and a
   `winnerLaneIndex`; the other two states carry an empty `lanes` array, a
   null winner, and a `CompareJudgeFailureReason` (`CALL_FAILED`,
   `PARSE_FAILED`, `NOT_ENOUGH_ANSWERS`). A provider throw, a malformed reply,
   or fewer than two completed lanes all land here — none of them silently
   picks a default lane. `resolveBestResponse` on the frontend enforces the
   same rule: with a judge verdict present, "best" is the judge's winner or
   nothing, never the old length/latency heuristic standing in for a verdict
   the judge did not give.

4. **Ties are ties.** Lanes get a competition rank (`1, 1, 3`, not `1, 2, 3`)
   from their scores. A tie for first place leaves `winnerLaneIndex: null` and
   lists the tied lanes in `tiedLaneIndices` — no coin flip, no "first one
   wins" tiebreaker.

5. **Fair truncation, with the judge told about it.** `fitAnswersFairly`
   max-min "water-fills" the judge's answer budget: every answer that must be
   shortened is cut to the **same** length, and an answer already under that
   length is left untouched — never a flat percentage cut, which would punish
   a thorough answer twice. The budget itself
   (`computeAnswerBudgetChars`) is the judge model's real context window minus
   its output reserve, system overhead, tool overhead and everything already
   committed (framed system prompt, history, the prompt skeleton). The prompt
   tells the judge exactly which candidates were shortened and to what length,
   and instructs it not to penalise the shortening itself.

6. **The billing chokepoint, once per run.** The call goes through
   `ModeExecutionGatewayManager.run` → `ChatExecutionManager.callProvider` —
   the same chokepoint every other mode uses — tagged
   `TokenLedgerContext.JUDGE` / `PaygSurface.JUDGE` with workflow
   `PAYG_WORKFLOW_COMPARE_JUDGE = 'compare-judge'`. The hold's `requestId` is
   `${runId}:compare-judge`: **exactly one reservation per Compare run**,
   idempotent on retry, never one per lane. Context comes from
   `ChatContextGatewayManager.build({ surface: ChatSurface.JUDGE, ... })`, so
   the judge is sized to its own model's context window rather than the
   generator's.

7. **The critic, once per lane, feeding the one judge call.** When the user
   turns the critic on, `JudgeRefereeManager.critiqueLane` (a new thin
   entry point reusing the existing critic resolution, plan gate and
   parse-failure handling) still runs once per completed lane. Its notes are
   folded into the comparative prompt as `Critic notes on candidate X: …`; its
   **score is dropped** before it reaches the judge — a per-lane critic score
   is exactly the uncalibrated number this ADR exists to stop comparing. A
   failed critic call leaves that lane's notes empty; it never blocks the
   judge.

8. **Original instructions are shown as data, never obeyed.** Same framing the
   single-lane judge already used
   (`REVIEW_ORIGINAL_INSTRUCTIONS_FRAME` /
   `frameCompareJudgeSystemPrompt`): the thread's own system prompt is
   included so the judge can assess compliance, but is explicitly marked as
   context, not an instruction to the judge itself. A thread whose system
   prompt says "answer only in French" must not produce a French JSON verdict.

9. **The verdict is stamped on every lane.** `CompareJudgeVerdict` is
   identical on every `ParallelModelResponse` of the run
   (`response.compareJudge`), alongside that lane's own position
   (`response.compareLaneIndex`) so a client can find itself in the shared
   ranking without re-deriving anything. `CompareJudgeState.RANKED` is a new
   badge state; `resolveLaneJudgeState` marks a lane that did not complete as
   `SKIPPED` regardless of the run's overall verdict.

## Consequences

- **One judge call per Compare run, always** — not one per lane. A 5-model
  comparison now makes exactly one billed judge call instead of five.
- Scores across lanes are now comparable by construction: they come from the
  same call, the same context, the same scale.
- The critic still runs once per lane (unchanged cost), but its score is
  advisory input to the one judge call, not a second, uncalibrated ranking
  signal.
- The single-lane `JudgeRefereeManager.evaluate` is untouched and keeps
  serving chat, consensus, escalation and every other mode that judges one
  answer against its own history.
- The frontend's "best response" badge is now judge-driven whenever a judge
  ran: a tie, a parse failure or a call failure shows a notice
  (`compare.ranking.*` i18n keys, all 13 locales) instead of a best pick.

## Alternatives considered

- **Keep per-lane scoring, normalise afterwards.** Rejected: normalising N
  independently-calibrated scores cannot recover information the judge never
  had — it did not know what else it was up against when it scored lane A.
- **A single call, no anonymisation/shuffle.** Rejected: without it, a
  judge's documented preference for early-listed candidates would silently
  reproduce the user's own model-selection order as the ranking.
- **Best-effort ranking on a parse failure** (regex-scrape a winner out of
  prose). Rejected outright — this is the exact failure mode rule 49 and this
  ADR both exist to prevent: a fabricated winner is worse than an honest
  "judge unavailable".

## References

- `apps/claw-chat-service/src/modules/chat-messages/managers/compare-judge.manager.ts`
- `apps/claw-chat-service/src/modules/chat-messages/utilities/compare-judge.utility.ts`
- `apps/claw-chat-service/src/modules/chat-messages/constants/compare-judge.constants.ts`
- `apps/claw-frontend/src/components/chat/compare-judge-ranking.tsx`
- [ADR-055](adr-055-canonical-ai-authority-hierarchy.md) — authority hierarchy this ADR sits under
- `rules/28-billing-integrity-and-api-contracts.md`, `rules/37-payg-credit-integrity.md`
