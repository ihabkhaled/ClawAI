# Runbook — Wire a production SAML IdP into ClawAI Fleet SSO

**Audience:** Fleet/Org administrators bringing their tenant onto ClawAI
**Service:** `claw-agent-service` Stream 40 — `FleetModule` + `SamlController`
**Status:** Mock IdP harness live-tested 2026-05-09; production-tenant rollout requires the steps in this doc.

---

## 0. What lives where (so you know what you're configuring)

- Verifier code: [apps/claw-agent-service/src/modules/fleet/utilities/saml-verifier.utility.ts](../../apps/claw-agent-service/src/modules/fleet/utilities/saml-verifier.utility.ts)
- Service: [apps/claw-agent-service/src/modules/fleet/services/saml.service.ts](../../apps/claw-agent-service/src/modules/fleet/services/saml.service.ts)
- Controller: [apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts](../../apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts)
- Mock IdP harness: [qa/saml-mock-idp.mjs](../../qa/saml-mock-idp.mjs)

The verifier is intentionally library-free: a tight regex extractor + Node `crypto.createVerify`. It accepts SAML responses from Okta, Microsoft Entra ID (formerly Azure AD), Auth0, Keycloak, Google Workspace, and any other SAML 2.0 IdP that signs the response with RSA-SHA256.

## 1. Prerequisites

- Admin access to your IdP tenant (Okta / Entra / Auth0).
- Admin JWT for ClawAI (any user with the `ADMIN` role on the org).
- An ACS URL: `https://<your-claw-host>/api/v1/agent/organizations/<org-slug>/sso/callback`.
- An entityId for ClawAI: `claw-fleet-<org-slug>` (free-form; must match what the IdP sends back).

## 2. IdP-side configuration

### 2a. Okta

1. Apps → **Create App Integration** → **SAML 2.0**.
2. **General**: app name `ClawAI Fleet — <org>`.
3. **SAML Settings**:
   - **Single sign on URL**: `https://<your-claw-host>/api/v1/agent/organizations/<slug>/sso/callback`
   - **Audience URI (SP Entity ID)**: `claw-fleet-<slug>`
   - **Name ID format**: `EmailAddress`
   - **Application username**: `Email`
   - **Attribute Statements**:
     | Name | Name format | Value |
     |---|---|---|
     | `email` | Basic | `user.email` |
     | `role` | Basic | `appuser.role` (or hardcode `MEMBER` to start) |
4. **Feedback** → **Finish**.
5. From the app's **Sign On** tab, click **View Setup Instructions** and grab:
   - **Identity Provider Issuer** (your `expectedIssuer`)
   - **X.509 Certificate** (download the .pem; you'll need its SHA-256 fingerprint)

### 2b. Microsoft Entra ID

1. **Enterprise applications** → **New application** → **Create your own** → name `ClawAI Fleet — <org>`.
2. **Single sign-on** → **SAML**.
3. **Basic SAML Configuration**:
   - **Identifier (Entity ID)**: `claw-fleet-<slug>`
   - **Reply URL (ACS)**: `https://<your-claw-host>/api/v1/agent/organizations/<slug>/sso/callback`
4. **Attributes & Claims** — add `email` (`user.mail`) and `role` (constant or group claim).
5. Download the **Certificate (Base64)** and copy the **Login URL** + **Microsoft Entra Identifier**. The Identifier is your `expectedIssuer`.

### 2c. Auth0

1. **Applications** → **Create Application** → **Regular Web Application**.
2. **Settings** → **Advanced Settings** → **Endpoints** — note the **SAML Protocol URL** (the IdP-side login URL).
3. **Connections** → enable an **Enterprise → SAMLP Identity Provider** wrap if Auth0 is fronting another IdP.
4. **Addons** → enable **SAML 2.0** on the application:
   - **Application Callback URL**: `https://<your-claw-host>/api/v1/agent/organizations/<slug>/sso/callback`
   - **Entity ID**: `claw-fleet-<slug>`
   - In the JSON **Settings** field, add:
     ```json
     {
       "mappings": { "email": "email", "role": "https://your.app/role" },
       "signResponse": true,
       "signatureAlgorithm": "rsa-sha256",
       "digestAlgorithm": "sha256"
     }
     ```
5. **Download the metadata.xml** — it contains the certificate + issuer.

## 3. Compute the SHA-256 fingerprint of the IdP cert

```bash
# from the X.509 PEM the IdP gave you
openssl x509 -in idp-cert.pem -noout -fingerprint -sha256 \
  | tr -d ':' | awk -F= '{print tolower($2)}'
```

The output is a 64-char hex string (no colons, lowercase). Save as `IDP_CERT_SHA256`.

## 4. ClawAI-side wiring

For each org you want to enable SSO on:

```bash
# 1. Get an admin JWT
TOKEN=$(curl -fsS -X POST $CLAW/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@your.org","password":"..."}' \
  | jq -r '.tokens.accessToken')

# 2. Create the org (or use an existing slug)
curl -fsS -X POST $CLAW/api/v1/agent/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"slug":"acme","name":"Acme Corp"}'

# 3. Register the IdP metadata on the org
curl -fsS -X POST $CLAW/api/v1/agent/organizations/acme/sso/metadata \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d "{
    \"expectedIssuer\": \"$IDP_ISSUER\",
    \"x509CertSha256\": \"$IDP_CERT_SHA256\"
  }"
# Expected: HTTP 204 No Content
```

`expectedIssuer` is the literal `<saml:Issuer>` string from the IdP's responses (e.g. `http://www.okta.com/exk1abc2def3GHi4jK5l`).

## 5. Verify

1. Configure the IdP's app to log a test user in.
2. Hit the IdP login URL → IdP sends `SAMLResponse` POST to the ClawAI callback.
3. Watch `claw-agent-service` logs (`./scripts/claw.sh logs claw-agent-service | grep saml`) — expect a single info-level entry per callback, no error.
4. Response body: `{ nameId: "<user-email>", orgId: "<id>", attributes: [{name, values}, ...] }`.
5. The frontend's downstream session creation (in `claw-auth-service`) consumes `nameId` to mint a Claw JWT.

## 6. Troubleshooting

| Symptom                           | Likely cause                                             | Fix                                                                                                                              |
| --------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 400 `INVALID_SAML_RESPONSE`  | Base64 not URL-decoded, or response truncated            | Confirm IdP is using POST binding (not Redirect); body should be a single line of base64                                         |
| HTTP 401 `SAML_SIGNATURE_INVALID` | Wrong cert fingerprint                                   | Re-compute SHA-256 with the section-3 command; double-check it matches the IdP's _active_ signing cert (not the encryption cert) |
| HTTP 401 `SAML_ISSUER_MISMATCH`   | `expectedIssuer` doesn't match the response's `<Issuer>` | Look at the IdP response's `<saml:Issuer>` element; copy verbatim — including any trailing slash                                 |
| HTTP 200 but `attributes: []`     | IdP not configured to send claims                        | Add an `email` and `role` claim mapping in the IdP app config                                                                    |
| Cert rotation breaks logins       | IdP rolled to a new signing key                          | Run section-3 against the new PEM and re-`POST` `/sso/metadata`                                                                  |

## 7. Cert rotation

Most IdPs roll signing certs every 1–2 years. ClawAI stores ONE fingerprint per org, so on a rotation:

1. Download the new cert PEM from your IdP admin console.
2. Run section-3 to compute its sha256.
3. `POST /sso/metadata` with the new fingerprint (replaces the old one).
4. Test a fresh login. Old sessions stay valid (the verifier only matters at login-time).

For zero-downtime rotation, briefly accept _both_ fingerprints — pass them as a comma-separated string to `x509CertSha256` until the IdP is fully cut over to the new key. (The verifier accepts a comma-separated list.)

## 8. Testing without an IdP tenant

`qa/saml-mock-idp.mjs` generates a self-signed cert + valid SAML response on demand. The full flow:

```bash
# 1. Get an admin JWT (same as above)

# 2. Create an org
curl -fsS -X POST $CLAW/api/v1/agent/organizations \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"slug":"qa-org","name":"QA Org"}'

# 3. Generate a mock IdP response
IDP=$(node qa/saml-mock-idp.mjs --user qa@org.test --org qa-org)
ISSUER=$(echo "$IDP" | jq -r .expectedIssuer)
CERT_FP=$(echo "$IDP" | jq -r .metadata.x509CertSha256)
SAML=$(echo "$IDP" | jq -r .samlResponseBase64)

# 4. Register the mock metadata
curl -fsS -X POST $CLAW/api/v1/agent/organizations/qa-org/sso/metadata \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"expectedIssuer\":\"$ISSUER\",\"x509CertSha256\":\"$CERT_FP\"}"

# 5. Fire the callback
curl -fsS -X POST $CLAW/api/v1/agent/organizations/qa-org/sso/callback \
  -H 'content-type: application/json' \
  -d "{\"organizationSlug\":\"qa-org\",\"SAMLResponse\":\"$SAML\"}"
# → 200 { nameId, orgId, attributes: [...] }
```

Live-verified end-to-end on 2026-05-09. The IdP-tenant section above is the _only_ delta between dev/staging and production.
