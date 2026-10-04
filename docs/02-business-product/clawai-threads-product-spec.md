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

## Launch boundary

Generation obtains source text from Chat through an owner-scoped internal
snapshot request. Chat returns a deterministic versioned snapshot containing
only eligible user/assistant text, with a digest and explicit complete-transcript
limits. The snapshot endpoint and generation client are implemented; durable job
pinning lands with the job aggregate in a later batch. Every job will retain its
own snapshot version and digest, and a new generation takes a new snapshot.
JSON and Markdown are supported exports. TOON remains unavailable until a codec
proves semantic round-trip and useful measured token savings.

The public reader shows only approved, safety-checked fields. It does not show a
reader identity list. Unpublishing removes the revision from public reads and
discovery. Rollout remains disabled until generation, publication, moderation,
internationalization, and public discovery paths pass their release checks.
