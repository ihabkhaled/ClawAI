# Runbook — Fleet Admin + SSO (Stream 40)

Backend at `apps/claw-agent-service/src/modules/fleet/`. Routes:

- `POST /agent/organizations` — create org (caller becomes OWNER)
- `GET /agent/organizations` — list orgs the user is a member of
- `GET /agent/organizations/:id/members` — list members
- `POST /agent/organizations/:id/members` — add member with role
- `POST /agent/organizations/:slug/sso/metadata` — upload IdP metadata
- `POST /agent/organizations/:slug/sso/callback` — SAML POST-binding callback (public)

## Fleet RBAC + capability scoping

`AccessPolicy.orgId` lets policies be scoped to a specific organization. The capability risk service queries `findActiveForCapabilityClass(class, orgIds)` — a user sees:
- Global policies (`orgId = null`) — system defaults
- Policies scoped to any org they're a member of

A policy with `orgId` set is invisible to non-members. This is the fleet RBAC enforcement point.

## SAML SSO

The verifier at `utilities/saml-verifier.utility.ts` parses SAML POST-binding responses and validates the RSA-SHA256 signature against the X509 cert (or fallback SPKI public-key) embedded in the response. It does **not** depend on `passport-saml` or `samlify` — implementation is ~120 LOC of regex + `crypto.createVerify`.

### Configuring SSO for an org

```bash
# 1. Pull metadata from your IdP (Okta / Entra / Auth0)
#    Look for an XML file with <md:EntityDescriptor entityID="..."> at the top.
#    The entityID is the expectedIssuer.

# 2. POST it to the org
curl -X POST $API/api/v1/agent/organizations/<slug>/sso/metadata \
  -H "authorization: Bearer $JWT" \
  -H 'content-type: application/json' \
  -d '{"expectedIssuer":"<entity-id-from-idp>"}'
```

### Receiving callbacks

Configure your IdP to POST to:

```
https://<your-claw-host>/api/v1/agent/organizations/<slug>/sso/callback
```

with form params:
- `organizationSlug` — repeated in body for path-mismatch check
- `SAMLResponse` — base64-encoded SAML response

## Mock IdP for testing

`qa/saml-mock-idp.mjs` produces signed responses for QA without a real IdP:

```bash
node qa/saml-mock-idp.mjs --user qa@example.test --org my-org
# Outputs JSON: { expectedIssuer, samlResponseBase64, metadata }
```

## Common operational issues

### "SAML_VERIFICATION_FAILED with reason=signature_invalid"

The signed payload was tampered with OR the IdP's signing cert doesn't match the expected one. Check:
- `ssoMetadataJson.expectedIssuer` matches the `<saml:Issuer>` in the response
- The X509Certificate in the response is the IdP's actual cert (not a mock)

### "SSO_NOT_CONFIGURED"

The org's `ssoMetadataJson` is null. POST to `/sso/metadata` first.

### "SAML_SLUG_MISMATCH"

The `slug` in the URL path differs from `body.organizationSlug`. The IdP form-binding must include both for tamper resistance.

### "User authenticated but no membership"

The verifier returns `nameId` but doesn't auto-create memberships. A production deployment layers session creation in claw-auth-service which then creates an OrganizationMember if the email is on the org's allow-list.

## Health checks

```bash
docker exec claw-pg-agent psql -U claw -d claw_agent -c \
  "SELECT name, slug, \"ssoEnabled\", \"createdAt\" FROM organizations;"

docker exec claw-pg-agent psql -U claw -d claw_agent -c \
  "SELECT \"organizationId\", role, COUNT(*) FROM organization_members GROUP BY 1, 2;"
```

## Related documents

- [Capability Framework Runbook](runbook-capability-framework.md)
