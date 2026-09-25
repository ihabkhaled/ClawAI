> **Wiki source:** [`docs/02-business-product/requirements-register.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/requirements-register.md) on the current `main` branch. This page mirrors the repository documentation so the Wiki stays grounded in the codebase.

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
- **Touches:** [product-vision.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/product-vision.md),
  root `README.md`, `apps/claw-frontend` marketing copy (separate batch).
- **History:** 2026-09-26 created ([DRIFT-001](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/drift-log.md)).

### REQ-POS-002

- **Statement:** Every feature named in public copy or the README traces to
  wired, shipped code, recorded in the [flagship catalog](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/flagship-features.md)
  with an evidence path. Partial features carry their limit; unbuilt ones are
  not named.
- **Status:** current · **Priority:** high
- **Source:** owner instruction, 2026-09-26 ("never invent facts")
- **Acceptance:** each flagship row has an evidence path and a status; the
  catalog's gap table lists what copy must not claim.
- **Mechanism:** the audit step in
  [`skills/change-the-product-positioning.md`](https://github.com/ihabkhaled/ClawAI/blob/main/skills/change-the-product-positioning.md);
  no automated check exists yet.
- **History:** 2026-09-26 created.

### REQ-POS-003

- **Statement:** Pay-as-you-go is the lead commercial story: usage is metered as
  connector credit and shown in the visitor's currency.
- **Status:** current · **Priority:** high
- **Source:** owner decision, 2026-09-26
- **Acceptance:** met by shipped code (flagship 9). Numbers stay in
  [`docs/business/`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/business/README.md).
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
  billing or pooling. The Team plan description overclaims and needs the
  business owner's wording.
- **History:** 2026-09-26 created.

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
- **Status:** missing · **Priority:** high (security)
- **Source:** found by the ADR-126 flagship audit, 2026-09-26.
- **Current state:** `FleetController.listMembers`, `listDevices` and `addMember`
  (`apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts`)
  and `SamlController.setMetadata` do not check that the caller belongs to the
  organisation. Only `updatePolicy` checks a role. Any signed-in user who knows
  an organisation id can add a member to it.
- **Governing rule:** [rules/16](https://github.com/ihabkhaled/ClawAI/blob/main/rules/16-authentication-and-authorization.md) (IDOR).
- **History:** 2026-09-26 created; not fixed in the documentation batch that found it.
