# ClawAI Punch-List Completion — Design Spec

**Date:** 2026-08-09
**Status:** Approved for implementation
**Author:** Codex with Ihab Khaled

## 1. Scope

This design completes the remaining work from the attached ClawAI punch list after reconciling the handover with the current `main` branch. Items 1, 4, 6, 10, 11, 12, and 13 are already present. The remaining implementation is model-service availability gating, database-backed payment-gateway administration and post-auth checkout routing, self-service/admin account management, coding-agent qualification documentation, and correction of stale locale/runtime documentation.

Password-reset implementation is deliberately excluded from mentor-authored code. The attached qualification rule requires the ClawAI coding agent to implement that feature. This change may prepare and document the qualification surface, but it must not create the password-reset endpoint or UI on the coding agent's behalf.

## 2. Model-service availability

The health service remains the authority for optional-service availability. The frontend will query aggregated health through the existing health repository and a cached controller hook.

- `/models`, `/models/catalog`, and `/models/discovery` require Ollama.
- `/models/local-frontier` requires llama.cpp.
- The Models sidebar parent remains expandable when Ollama is unavailable, but its link is disabled.
- Unavailable child links are visibly disabled and expose `aria-disabled` semantics.
- Direct navigation renders a localized, actionable unavailable state.
- Query failures fail closed for the affected optional service without affecting unrelated navigation.

This intentionally follows the literal approved request even though `/models` includes cloud connector models.

## 3. Billing and gateway configuration

The payment service owns gateway configuration. PayPal and Paymob runtime credentials move from direct environment reads to encrypted database records. `PAYMENT_TOKEN_ENCRYPTION_KEY` and its key version remain environment-owned because a database cannot safely protect its own encryption root.

### 3.1 Persistence and safe API

A gateway-configuration record stores the gateway, enabled state, environment/mode, non-secret options, encrypted credentials, and audit timestamps. Provider-specific DTO schemas bound every accepted field. Stored secrets are never returned. Admin projections expose only stable field metadata and configured/not-configured state.

Endpoints:

- `GET /billing/gateways` — authenticated, returns only active checkout-safe gateway metadata.
- `GET /admin/payment-gateways` — requires `ADMIN_PLANS_MANAGE`, returns safe admin projections.
- `PUT /admin/payment-gateways/:gateway` — requires `ADMIN_PLANS_MANAGE`, updates enabled state, options, and explicitly supplied credentials.

Blank secret fields preserve the existing secret; an explicit clear operation is separate and validated. Disabling a gateway prevents new checkout sessions but does not disable webhook verification, reconciliation, refunds, or reads needed to settle existing financial state.

### 3.2 One-time environment import

At payment-service startup, a versioned bootstrap service uses the existing `SeedExecution` ledger to import configured PayPal/Paymob environment values exactly once. Existing database rows win. The importer is idempotent and records completion only after the configuration transaction succeeds. Environment gateway fields remain accepted only as the migration source and are documented as deprecated for runtime use.

### 3.3 Runtime consumers

PayPal/Paymob adapters, token managers, checkout URL construction, and readiness checks read typed runtime configuration through one service. Public identifiers such as the PayPal client id may be returned only in the checkout-safe public projection; client secrets, HMAC secrets, webhook ids, and access tokens never cross the backend boundary.

### 3.4 Post-auth checkout

Marketing plan links preserve a safe `returnTo` target through registration and login. Successful authentication lands on `/billing/checkout?plan=<slug>&interval=<interval>`. The page resolves the canonical plan and integer price from the billing API and displays a compact payment rail:

`selected plan → server-resolved amount → active gateway → hosted checkout`

The gateway selector is API-backed. PayPal is labeled “PayPal / Card” and shows an initialization loader until both funding buttons are ready. Paymob carries a localized “Testing – Soon” badge. With no active gateway, the page shows a directed empty state and cannot submit.

The visual treatment extends the existing billing design tokens. The payment rail is the signature element; surrounding cards, typography, spacing, and motion remain consistent with the current portal.

## 4. Account management

The auth service remains the sole owner of identity and session data.

- Self-service users may update username/email.
- Existing current-password change remains unchanged.
- Self-service account deletion requires current-password confirmation, revokes auth-owned sessions, and deletes the auth-owned user record.
- Deletion does not query or mutate another service database. Financial/audit records governed by their owning services remain intact.
- Admins may edit safe profile fields and deactivate/reactivate users.
- All administrative user mutations are enforced by `ADMIN_USERS_MANAGE` in the backend, not merely hidden in the frontend.

Emailed password reset and administrative force reset remain coding-agent-owned qualification work.

## 5. Coding-agent and documentation

The current coding-agent submodule is v0.57.3 and already contains the Runtime V2 tool-catalog, AUTO-routing, failure-recovery, output-bound, effort-budget, and workspace-root corrections described as missing by the handover. Documentation will be brought forward to that reality.

The coding-agent lab will clearly distinguish automated readiness from the remaining human-operated password-reset qualification run. Locale governance will be corrected to the actual 13 locales: `en`, `ar`, `de`, `es`, `fa`, `fr`, `hi`, `it`, `ja`, `pt`, `ru`, `th`, and `zh`.

Runtime-progress documentation will describe the distinct critic and judge stream stages. Payment documentation will describe database ownership, one-time environment import, secret redaction, and operational disable semantics.

## 6. Error handling and security

- Optional-service health failures render stable localized unavailable states.
- Billing prices, amounts, currencies, and plan identity are always server-resolved.
- Gateway secrets are AES-256-GCM encrypted with gateway/field-bound AAD.
- Secret values and provider response bodies are absent from API responses and logs.
- Gateway configuration updates are permission checked and audited through existing structured mechanisms.
- Account deletion requires fresh password verification and cannot target another user.
- All new input uses bounded Zod DTOs and stable `BusinessException` codes.

## 7. Test strategy

Every production change begins with a failing test.

- Frontend: service availability mapping, disabled sidebar semantics, direct-route boundaries, auth return routing, exact billing repository requests, gateway empty/loading states, account forms, and all 13 locale completeness checks.
- Payment: DTO bounds, safe projections, encryption/AAD, idempotent seed execution, permission-protected controllers, disabled-gateway checkout refusal, adapter/runtime configuration, and no-secret response assertions.
- Auth: self profile update, password-confirmed deletion, session revocation, permission guard behavior, and safe admin update/deactivate flows.
- Coding agent/chat: preserve existing Runtime V2 AUTO-routing and tool-catalog regression tests; documentation-only updates do not fabricate a live qualification result.

## 8. Delivery sequence

1. Model availability gating.
2. Gateway persistence, bootstrap, API, and runtime migration.
3. Post-auth checkout and admin gateway UI.
4. Account-management backend and frontend.
5. Coding-agent and canonical documentation corrections.
6. Scoped gates, generated-artifact regeneration after formatting, knowledge/inventory checks, release preflight, coherent commits, and pushes.
