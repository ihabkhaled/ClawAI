# ClawAI Threads product decisions

Owner decisions recorded 2026-10-04; canonical product details live in
[`clawai-threads-product-spec.md`](../docs/02-business-product/clawai-threads-product-spec.md).

- A visible publication/indexing disclosure plus generation records intent;
  owner approval is still required to publish.
- Require a user-selected maximum spend. Reuse existing entitlement and credit
  flows; do not add PAYG pricing.
- Keep approved revisions public anonymously after account deletion; remove
  private generation data and personal links as defined in the product spec.
- Keep chat-share lockdown; approved Threads use independent discovery rules.
- Persist the owner's selected content locale. Generation authors, canonical
  article URLs, discovery lists, sitemap chunks, and feeds use that locale.
- Use two services, work directly on `main`, and gate changed files with normal
  hooks and valid tree-bound receipts.
- Publication safety keeps secret/PII matches private using reason codes only.
  Public reads require owner approval, safety approval, and index eligibility;
  owners can unpublish and export JSON/Markdown. Each immutable text edit uses a
  fresh owner-selected cap and durable Generation-service revalidation against
  the original pinned source and evidence. The old approved revision stays
  public until explicit owner approval of the hash-matched replacement.
- Community contribution behavior is implemented in the Threads backend:
  authenticated comments, per-user reactions, change requests, and reports;
  report moderation uses `THREAD_PUBLICATIONS_MODERATE`. Account deletion keeps
  approved public works anonymous and removes private generation data. Live
  deletion and role-matrix QA remain pending.
