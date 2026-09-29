# Requirements Register

Product and business requirements that are not owned by a single feature spec:
positioning, cross-cutting commitments, and requirements found missing. A
feature's own requirements stay in its spec under this folder or in
`docs/features/<feature>/02-product-requirements.md`; this register links to
them rather than copying them.

**Rules.** An id is never reused. Entries are never deleted — a dropped
requirement keeps its row with why and who decided. The history column is
append-only. A requirement inferred rather than stated by the owner is marked
_inferred_ until the owner confirms it.

| Status  | Means                                                              |
| ------- | ------------------------------------------------------------------ |
| current | In force as written                                                |
| changed | In force, reworded or reprioritised; the history says from what    |
| missing | Needed, not yet specified or built; a question for the next intake |
| dropped | No longer wanted; kept so it is not re-proposed                    |

---

## Positioning (ADR-126)

### REQ-POS-001

- **Statement:** The product's public slogan is "Every AI, one workspace." and its
  description is "Every frontier AI model in one workspace that sees, hears,
  researches and builds. Pay as you go, bring your team, or run it on your own
  hardware."
- **Status:** current · **Priority:** high
- **Source:** owner decision, 2026-09-26
- **Acceptance:** the README, the product vision and the marketing site carry the
  same wording; no surface still leads with "One Subscription".
- **Touches:** [product-vision.md](../01-executive-context/product-vision.md),
  root `README.md`, `apps/claw-frontend` marketing copy (separate batch).
- **History:** 2026-09-26 created ([DRIFT-001](drift-log.md)).

### REQ-POS-002

- **Statement:** Every feature named in public copy or the README traces to
  wired, shipped code, recorded in the [flagship catalog](flagship-features.md)
  with an evidence path. Partial features carry their limit; unbuilt ones are
  not named.
- **Status:** current · **Priority:** high
- **Source:** owner instruction, 2026-09-26 ("never invent facts")
- **Acceptance:** each flagship row has an evidence path and a status; the
  catalog's gap table lists what copy must not claim.
- **Mechanism:** the audit step in
  [`skills/change-the-product-positioning.md`](../../skills/change-the-product-positioning.md);
  no automated check exists yet.
- **History:** 2026-09-26 created.

### REQ-POS-003

- **Statement:** Pay-as-you-go is the lead commercial story: usage is metered as
  connector credit and shown in the visitor's currency.
- **Status:** current · **Priority:** high
- **Source:** owner decision, 2026-09-26
- **Acceptance:** met by shipped code (flagship 9). Numbers stay in
  [`docs/business/`](../business/README.md).
- **History:** 2026-09-26 created.

### REQ-POS-004

- **Statement:** The whole product runs on the customer's own hardware, with
  local models available, as a supported deployment.
- **Status:** current · **Priority:** high
- **Source:** owner decision, 2026-09-26 (pillar "local-first and privacy")
- **Acceptance:** met by shipped code (flagship 14); local AI is opt-in at
  install.
- **History:** 2026-09-26 created.

### REQ-POS-005

- **Statement:** A team or business customer can hold one account with several
  members, shared billing and pooled usage.
- **Status:** missing · **Priority:** _Unknown - ask the owner and record the answer._
- **Source:** implied by the owner's "bring your team" pillar (2026-09-26) —
  _inferred_. Also implied by the Team plan's seeded description, "Shared
  workspaces and a large pooled allowance"
  (`apps/claw-auth-service/prisma/seeders/plan-catalog.json`).
- **Current state:** not built. Users are admin-managed on one install, each with
  their own plan and quota. The only organisation model is the coding-agent
  fleet's, which is API-only.
- **Until built:** copy says "bring your team" and describes admin-managed users,
  roles, plan grants and usage statistics; it does not promise seats, shared
  billing or pooling. The Team plan description no longer overclaims
  (2026-09-29, text only: "A large monthly allowance for heavy daily use.").
- **History:** 2026-09-26 created; 2026-09-29 Team plan description corrected (owner
  approved a text-only change).

### REQ-POS-006

- **Statement:** Business customers can sign in with SSO (SAML or OIDC).
- **Status:** missing · **Priority:** _Unknown - ask the owner and record the answer._
- **Source:** _inferred_ from the teams/business pillar, 2026-09-26.
- **Current state:** not built for the web app. A SAML callback exists in
  `apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts` but
  creates no session and has no UI.
- **History:** 2026-09-26 created.

## Found missing during the audit

### REQ-SEC-001

- **Statement:** Only a member (with a sufficient role) of a coding-agent
  organisation may list its members or devices, add a member, or set its SAML
  metadata.
- **Status:** done · **Priority:** high (security)
- **Source:** found by the ADR-126 flagship audit, 2026-09-26.
- **Current state:** fixed in commit `cbe566511`. `OrganizationAccessService`
  (`apps/claw-agent-service/src/modules/fleet/services/organization-access.service.ts`)
  checks the caller's own membership in the service layer. Members may read the
  member list; OWNER/ADMIN may add members, change the policy, set SSO metadata
  and read the device matrix; only an OWNER may grant OWNER; re-adding an
  existing member is 409. Outsiders, including platform admins, get 404.
  Production had 0 organisations when fixed, so nothing was exploited.
- **Governing rule:** [rules/16](../../rules/16-authentication-and-authorization.md) (IDOR).
- **History:** 2026-09-26 created; fixed the same day.

## Chat supremacy program (2026-09-29)

Intake audit: [`chat-capability-audit-2026-09.md`](../14-risk-debt/chat-capability-audit-2026-09.md) ·
benchmark: [`chat-competitive-benchmark-2026-09.md`](chat-competitive-benchmark-2026-09.md).

### REQ-CHAT-001

- **Statement:** A user can branch a conversation from any message, get back to
  the source from the branch, and see the branches cut from a conversation. A
  branch inherits the conversation up to the fork point (text, attachments,
  settings, privacy switches) and never anything said after it — including via
  cross-thread retrieval.
- **Status:** done · **Priority:** high
- **Source:** Chat Supremacy prompt pack, Batch A (owner, 2026-09-29).
- **Current state:** ADR-129 — lineage columns, full-field copy, family
  exclusion, `GET /chat-threads/:id/lineage`, lineage strip + thread-list icon.
  Merge-back is not built (no product decision on what a merged message is).
- **History:** 2026-09-29 created and delivered (Batch 1).

### REQ-CHAT-002

- **Statement:** Privacy defects found by the intake audit are fixed before
  further memory-dependent features: memory extraction must honour a chat's
  `useMemory=false`, and a chat with `useCrossThreadContext=false` must not be
  retrieved INTO other chats.
- **Status:** done · **Priority:** high (privacy)
- **Source:** intake audit defects 3–4, 2026-09-29 (_inferred_ — owner to confirm
  the intended semantics of the per-chat switch).
- **Current state:** fixed 2026-09-30 (Batch 3). `message.completed` carries
  `useMemory`; memory-service skips extraction when it is false. Cross-thread
  candidates require BOTH switches on. The settings copy in 13 locales now says
  both directions (and no longer claims cross-thread is off by default, which
  was untrue). The two-way reading is still _inferred_ — owner to confirm.
  Open question for the owner: a chat with **Use memory** off but **Use
  relevant previous chats** on still READS other chats (the reader side checks
  only the second switch). Should "memory off" mean fully private instead?
- **History:** 2026-09-29 created; 2026-09-30 delivered.

### REQ-CHAT-003

- **Statement:** A user can select text in any earlier message, quote it into
  the composer (up to 3), and ask about it; the answer knows exactly which text
  was meant, and the quote stays visible on the sent turn.
- **Status:** done (messages) · **Priority:** high
- **Source:** Chat Supremacy prompt pack, Batch B (owner, 2026-09-29).
- **Current state:** ADR-130. Quoting from citations, file previews, research
  reports and generated documents waits for batches M and D.
- **History:** 2026-09-30 created and delivered (Batch 2).

### REQ-CHAT-004

- **Statement:** A user can answer the same question again with a model of
  their choice (or AUTO), and can edit a question without deleting the
  conversation after it.
- **Status:** done · **Priority:** high
- **Source:** Chat Supremacy prompt pack, Batch E (owner, 2026-09-29).
- **Current state:** ADR-131. Regenerate also gained the plan/quota check it
  was missing. Still open in batch E: send an answer to Repair/Verify/Compare
  from the message, and "continue" a truncated answer.
- **History:** 2026-09-30 created and delivered (Batch 4).

### REQ-CHAT-005

- **Statement:** An answer's inline `[n]` opens the exact source the model was
  given under that number — and never a source it was not given.
- **Status:** done (main chat) · **Priority:** high
- **Source:** Chat Supremacy prompt pack, Batch M (owner, 2026-09-29).
- **Current state:** ADR-132, rule 41 §16. Compare/lab lanes, file-page
  provenance and a grounded-vs-model-knowledge marker are not built.
- **History:** 2026-09-30 created and delivered (Batch 5).

### REQ-CHAT-006

- **Statement:** When the user asks, in their own words, to remember something
  or add it to their context, a model decides memory, context pack or both,
  saves the right text with the right memory type, asks which pack when the user
  has packs and did not name one, shows a saved card with links to the exact
  item, keeps it in the chat history, and the AI confirms it is done.
- **Status:** done · **Priority:** high
- **Source:** owner, in chat, 2026-09-30 (with the four design choices recorded
  in ADR-133).
- **Current state:** ADR-133. Changing a memory's type happens on the Memory
  page (the card's link opens the editor), not on the card.
- **History:** 2026-09-30 created and delivered (Batch 6).
