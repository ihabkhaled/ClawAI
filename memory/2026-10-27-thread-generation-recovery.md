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

**Related.** [Debug a failed Thread generation](../skills/debug-a-failed-thread-generation.md),
[Thread generation service guide](../docs/04-backend/service-guide-thread-generation.md).
