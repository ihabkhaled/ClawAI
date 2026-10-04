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
- Use two services, work directly on `main`, and gate changed files with normal
  hooks and valid tree-bound receipts.
