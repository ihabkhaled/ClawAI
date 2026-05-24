# Runbook — Fleet Enterprise SSO + Device Governance

> Owner: Desktop Agent V2 Stream 07
> Added: 2026-05-24

ClawAgent's fleet layer (`apps/claw-agent-service/src/modules/fleet/`)
ships with a SAML 2.0 verifier and a mock IdP harness validated
end-to-end on the local stack. This runbook covers what operators must
do to wire a real production IdP (Okta, Microsoft Entra, Auth0) plus
the device-governance levers available today.

## SAML verifier — what's in the box

| Component                                          | Status                                                          |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `utilities/saml-verifier.utility.ts`               | Real RSA-SHA256 verify via `node:crypto`, no `passport-saml`    |
| `services/saml.service.ts` + `saml.controller.ts`  | `/organizations/:slug/sso/metadata` + `/sso/callback` endpoints |
| `qa/saml-mock-idp.mjs`                             | Generates a key pair, signs a SAML response, posts to callback  |
| Org-scoped SSO toggle (`Organization.ssoEnabled`)  | Live since Round 7                                              |
| Org-scoped IdP metadata XML                        | Live; pasted into `/sso/metadata` per org                       |
| Just-in-time user provisioning                     | Live; new users created on first successful callback            |

The mock IdP test (Round 8 evidence) exercises every code path of the
production flow EXCEPT the actual cross-network handshake. That gap is
what this runbook closes.

## Production IdP rollout

### Step 1 — pull IdP metadata

Every IdP exposes a SAML Service Provider metadata XML. ClawAgent
consumes the metadata at one URL per tenant.

- **Okta**: Admin Console → Applications → ClawAgent app → Sign On
  → Identity Provider metadata. Save as `<tenant>-okta.xml`.
- **Microsoft Entra (Azure AD)**: Enterprise applications → ClawAgent
  → Single sign-on → SAML Signing Certificate → Federation Metadata
  XML.
- **Auth0**: Applications → ClawAgent → Addons → SAML2 → Identity
  Provider Metadata.

### Step 2 — register the metadata with ClawAgent

```bash
# As an admin user in the target organization
curl -X POST \
  -H "Authorization: Bearer <admin JWT>" \
  -H "Content-Type: application/xml" \
  -d @<tenant>-okta.xml \
  https://api.clawai.dev/api/v1/agent/organizations/<org-slug>/sso/metadata
```

This sets `Organization.ssoMetadataXml` and computes the
`signingCertFingerprint` server-side; future callbacks for that org
verify against this pinned fingerprint, so a man-in-the-middle that
serves a forged metadata XML cannot succeed.

### Step 3 — assertion consumer service URL

Give the IdP the ACS URL:

```
https://api.clawai.dev/api/v1/agent/organizations/<org-slug>/sso/callback
```

For Okta / Entra / Auth0, this is the "Sign-On URL" or "Reply URL"
field. ClawAgent expects POST-binding (the IdP HTTP-POSTs the signed
assertion).

### Step 4 — test the round trip

```bash
# Open the IdP-initiated SSO URL in a browser; the IdP redirects you
# to /sso/callback, which validates the assertion, creates / re-uses
# the user, and returns a ClawAI session JWT.
open "https://<idp-host>/app/clawagent/sso"
```

A successful callback log line is `[saml] verified assertion for
nameId=<email> orgId=<id>`. A failed verify logs the specific
failure (signature mismatch, expired NotOnOrAfter, etc.) — paste it
into the support ticket if rolling back.

### Step 5 — JIT provisioning + role mapping

By default, a successful SAML callback creates a new ClawAI user
(ROLE=OPERATOR) and adds them as an OrganizationMember of the matching
org with role=MEMBER. To override:

- Pass a `groups` SAML attribute. If it contains `clawai-admins`, the
  user is added as OWNER.
- Pass a `claw_role` SAML attribute (`ADMIN` / `OPERATOR` / `VIEWER`)
  to set the platform-level user role.

These mappings are tunable in `services/saml.service.ts:applyAssertionAttributes`.

## Device governance

The desktop agent fleet is governed via:

1. **Per-org default policies** seeded at org-create time
   (`PolicyRepository.findActiveForCapabilityClass(class, orgIds)`).
   Org-scoped policies override the global default; the highest
   `priority` field wins. Edit via the existing
   `POST /agent/policies` endpoint with `orgId` set.
2. **Device matrix** — `GET /agent/organizations/:id/devices` (V2
   Stream 07) lists every Device row whose owner is a member of the
   org. Includes `lastSeenAt`, `status`, `agentVersion`, paired-OS, and
   the count of PENDING capability invocations. Useful for triaging
   stale or revoked devices.
3. **Mass-revoke** — operators with OrganizationRole=OWNER can call
   `POST /agent/devices/:id/revoke` against every device in the org.
   A future Stream 07.x will add a single mass-revoke endpoint that
   takes an org id + a reason string.
4. **Agent CLI version pinning** — set `Organization.minimumAgentVersion`
   to refuse heartbeats from out-of-date CLIs (forces auto-update).
   Not yet wired; tracked in `docs/14-risk-debt/technical-debt.md`.

## Rollback procedure

If a production IdP rollout breaks the SSO callback:

1. **Disable SSO** for the affected org:
   ```sql
   UPDATE "Organization" SET "ssoEnabled" = false WHERE id = '<orgId>';
   ```
   All members fall back to email/password login until the metadata
   issue is fixed.
2. **Don't delete `ssoMetadataXml`** — keep it so the failed
   fingerprint is preserved for debugging.
3. Capture the failing callback request body + claw-agent-service log
   lines tagged `[saml]`, file with your IdP vendor support.

## See also

- `apps/claw-agent-service/src/modules/fleet/utilities/saml-verifier.utility.ts`
- `qa/saml-mock-idp.mjs` — local IdP harness; re-runnable
- `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/07_fleet_enterprise_sso_and_device_governance.md`
