### Thread retries can exhaust their fallback budget before a proven model runs (2026-10-27)

**What happened.** An owner-visible production generation failed at author voting
on attempt 3 of 3 after roughly 1.56 million included tokens. Its saved step log
shows repeated HTTP 400 `VALIDATION_FAILED`, context-window reductions, invalid
structured outputs, provider 503s, a retired-model 404 and provider credit
exhaustion. Earlier calls succeeded after reducing context, repairing format or
using a fallback. On the last attempt a previously successful Grok fallback was
skipped because the step retry limit was reached. The detailed owner-only
snapshot was retained locally before retry; it contains private generation data
and must not be committed or quoted in logs.

**The durable lesson.** A provider failure summary can hide request validation
and model selection failures. Record each actual cause and preserve completed
checkpoints; a successful fallback is useful evidence for later stages, but it
does not waive safety, review, owner approval or budget limits.

**How to apply.** Inspect progress and role-level failures before retrying;
distinguish request validation from provider outages, check whether a useful
fallback is reached within the budget, and verify checkpoint reuse and final
publication. Treat the observed causes as hypotheses until traced in code.

**Follow-up evidence (2026-10-27).** The authorized retry reused the research
snapshot and saved author checkpoints where the model and hashes still matched.
Three author votes and Judge completed in round 1, but Critic rejected rounds 1
and 2 for low scores; a later author draft needed a citation-rule repair. The
job ultimately failed on attempt 3 in Critic review after three rounds were
below the critic threshold (`REVIEW_NOT_PASSED`). Judge completed in the final
round; the run did not publish. A post-failure owner-only snapshot was saved
locally and is excluded from source control. Additional observed errors included
malformed structured replies, citation-rule repair and provider unavailability.
These are recorded as outcomes, not as proof the retry can safely be forced
through review.

**Code findings and fixes.** Consensus vote construction had included candidate
drafts in shared material and appended them again per vote. The shared duplicate
was removed. `RoleHealer` now shrinks shared source before sending a prompt that
exceeds the chat gateway's 200,000-character contract, without deleting the
evidence/candidate sections. It prefers a previously accepted role model only
when that model remains in the allowed candidate queue and is not demoted. A
checkpoint with changed input/evidence hashes is replaced instead of leaving a
stale row that blocks saving the newly accepted output; identical hashes remain
idempotent. Offline replay and regression results are documented in the dated
QA evidence file when the run is complete. These changes do not bypass the
Judge, Critic, owner approval, author distinctness, spend limits or safety rules.

**Shorter-article retry observations.** After the first job failed review, the
owner-selected “Try a shorter article” action created a child and returned 201;
research was resumed from checkpoint. The child advanced through round 1
consensus and Judge, but Critic requested another revision. On attempt 2, round
1 consensus succeeded after request validation failures and source shrinking;
Judge then advanced the child to round 2. In round 2, the third author's draft
repeatedly returned invalid structured output, and its vote exhausted JSON
repair before switching to its configured GLM fallback. The fallback then
needed context shrinking. The Judge then rejected round 2 for a low score.
In round 3, author 3 again needed shrink/format recovery and consensus produced
HTTP 400 validation failures for authors 2 and 3. Grok's vote succeeded, but
their next fallbacks were skipped when the per-attempt healing budget ran out.
Attempt 2 was queued for attempt 3 at round 3 consensus (`VALIDATION_FAILED`).
The live run has not published. Do not treat this as a publish or successful-
review outcome.

**Related.** [Debug a failed Thread generation](../skills/debug-a-failed-thread-generation.md),
[Thread generation service guide](../docs/04-backend/service-guide-thread-generation.md).

**Retry-form follow-up (2026-10-27).** The production review UI showed a failed job at attempt 3 of 3. The footer button labeled "Retry on us" opens the retry-with-changes form; it does not itself submit a retry. Submitting the prefilled form returned HTTP 201 and progressed to attempt 1 of 3 at round 2, preserving the completed research snapshot. The new run must still pass Judge, Critic, owner review and publication.

**Follow-up retry outcome (2026-10-27).** The submitted retry reached attempt 3 of
3 and failed at Judge review with `REVIEW_NOT_PASSED` after 401,292 included
tokens. The UI reports that the draft did not pass reviews and that no further
automatic work could be tried. Judge low scores occurred in rounds 1, 2 and 3;
the Critic was changed to `anthropic/claude-opus-5.5` and also scored the draft
too low in round 2. Saved research/checkpoints were reused. This retry did not
publish. A new retry needs an owner-selected draft/model/topic adjustment; do
not claim that a role-model swap fixed the review outcome.

**Judge-model retry (2026-10-27).** A subsequent checkpointed retry changed the
Judge from `gpt-oss:120b` to `gpt-5.6-sol` while retaining the saved research and
the Opus Critic. It reached round 3, then failed at Judge on attempt 3 of 3 with
551,431 included tokens. The round-1 and round-2 Judge also scored low; the
round-3 Judge caused the terminal failure. The alternate Judge alone did not
resolve the review loop. Inspect its recorded feedback before choosing any next
model or draft change; no publish occurred.

**Third targeted retry (2026-10-27).** The next retry kept the original topic,
research, Judge (`gpt-5.6-sol`) and Opus Critic, replacing author 3
`nemotron-3-nano:30b` with `gpt-5.5`. It again reached attempt 3 of 3 and failed
at Judge review with `REVIEW_NOT_PASSED` after 907,298 included tokens. The Judge
scored rounds 1, 2 and 3 too low; round 3 proceeded after the revised authors'
drafts. This is evidence that changing the Judge alone or strengthening one
author does not clear the underlying substantive review gap. The displayed
Judge brief calls for a research question and testable hypotheses, neutral
behavior terminology, a measurable experiment, evidence/source distinctions,
primary sources, and careful repository-grounded claims. Save the latest
owner-only browser snapshot privately; do not commit raw generated draft text.

**Fourth observed terminal outcome (2026-10-27).** The `gpt-5.5` third-author
retry finished all three rounds on attempt 3 of 3, then failed Judge review with
`REVIEW_NOT_PASSED` at 907,298 included tokens. The selected Judge remained
`gpt-5.6-sol`; it recorded low scores in each round despite the author model
change. The job did not publish. Do not start another model-only retry on the
same unchanged prompt: the evidence points to a persistent substantive
brief/draft mismatch, and each full attempt is costly.

### Paid model classes (2026-10-27)

**What happened.** The owner chose to exclude `PREMIUM` and `ULTRA` cost classes from Free access while enabling all five registered classes on every paid catalog plan.

**The durable lesson.** A plan class allow-set is an upper bound. Explicit per-model rows may refine usage roles but cannot widen the cost class entitlement. Resolve classes from the routing service price registry and fail closed when a class is unknown.

**How to apply.** Keep one class policy in the plan catalog, enforce it at chat, route selection and Runtime V2 admission, and render the exact class list on each public plan card. When classifying models, use the routing registry's canonical cost data rather than provider names or stale product copy.

**Related.** [Plan and quota specification](../docs/06-data/plan-and-quota-specification.md#5-model-access), [Auth service rules](../apps/claw-auth-service/CLAUDE.md), [Thread generation recovery](2026-10-27-thread-generation-recovery.md).

**Alternate Judge retry and replay-loop diagnosis (2026-10-27).** The owner-authorized retry retained the saved research checkpoint and used GPT-5.6-Terra as Judge with the original three authors. Terra rejected the draft in all three review rounds; attempt 1 ended REVIEW_NOT_PASSED at 591,546 included tokens. The subsequent automatic attempts 2 and 3 reused every saved author, consensus and Judge response, then failed again within seconds. The Thread remains unpublished. The revision brief calls for stronger primary sources, verifiable repository claims, reproducibility/statistical design details, and consistent Arabic. Do not repeat the same automatic replay.

**Local recovery fix.** Exhausting the three Judge/Critic/consensus rounds now raises DeterministicGenerationError, so the job ends once instead of retrying cached outputs. An owner retry after REVIEW_NOT_PASSED preserves the verified research checkpoint and invalidates all cached model-role replies so authors create a new draft; changed-topic retries continue to start from fresh research. Focused retry/pipeline tests passed: 5 files, 100 tests.

**Knowledge delta.** Updated `apps/claw-thread-generation-service/CLAUDE.md`, `docs/04-backend/service-guide-thread-generation.md`, `docs/06-data/plan-and-quota-specification.md`, this memory, both QA evidence files, the generated locale/hash manifests, and `docs/changes/2026-10-27-paid-model-access-and-thread-retry-recovery.md`. No new skill or numbered rule was needed: ADR-181/service guidance covers the retry mechanics, while the plan spec covers class access.
