# ClawAI Threads product spec

**Status:** Approved for implementation planning, 2026-10-04
**Canonical design:** [Threads design](../superpowers/specs/2026-10-04-clawai-threads-design.md)

## Product promise

Threads turns a private chat into a sourced article or thread through a
multi-model review workflow. The owner controls publication; community
participation is open to authenticated users under existing moderation rules.

## Launch decisions

- Content types: article, research article, guide, and technical explanation.
- Generation begins only after a clear disclosure that it records intent to
  publish and may be indexed. The draft stays private until the owner approves.
- Require a selected maximum spend before enqueue. Existing plan entitlement and
  credit reservation apply; no new pay-as-you-go price is introduced.
- Use three to five author models, exact-draft-hash unanimous agreement, Judge
  score of at least 80, Critic score of at least 75, and at most three rounds.
- Require citations for factual claims and keep source links with the revision.
- Authenticated users may comment, react, and request changes regardless of
  generation entitlement. Existing reporting, rate limits, owner controls, and
  admin moderation apply.
- Approved publications are independently eligible for indexing. Chat-share
  indexing lockdown remains unchanged.
- On account deletion, keep approved revisions public with anonymous
  attribution; delete private snapshots and generation artifacts, remove
  reactions, anonymize public comments, and delete pending private requests.

## Budget and plan enforcement

Reserve the existing research, judge, and critic plan allowances once per job.
Each paid model call reserves its existing wallet hold against the selected job
cap before provider execution. A denied sub-hold releases the wallet hold. A
successful call settles actual cost into the aggregate; failed calls release
both holds. A job cannot close while a call reservation is unresolved.

## Launch boundary

Generation obtains source text from Chat through an owner-scoped internal
snapshot request. Chat returns a deterministic versioned snapshot containing
only eligible user/assistant text, with a digest and explicit complete-transcript
limits. Every durable job retains its own snapshot version and digest, and a
new generation takes a new snapshot. The authenticated Threads API passes the
selected cap and starts the job; generation validates snapshot ownership before
reserving it through the existing Auth entitlement system. Threads allows
owner-scoped progress/cancellation and persists ready output as a private
pending revision.
JSON and Markdown are supported exports. TOON remains unavailable until a codec
proves semantic round-trip and useful measured token savings.

The public reader shows only approved, safety-checked fields. It does not show a
reader identity list. Unpublishing removes the revision from public reads and
discovery. Rollout remains disabled until generation, publication, moderation,
internationalization, and public discovery paths pass their release checks.

The publication service owns an isolated PostgreSQL database and an atomic
owner-approval transition. Generation-result handoff now stores output as a
private pending revision. Safety scanning, editable/revalidated revisions,
public reads, unpublish, exports, community features, internationalization, and
public discovery remain unfinished. Generation intent or a private draft alone
does not make content public.
