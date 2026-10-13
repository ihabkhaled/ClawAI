# ADR-172: Plugin installs are owner-scoped, consent is a stored grant, credentials are write-only

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-171](adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md). Design: [plugins-and-mcp-design](../implementation/plugins-and-mcp-design.md) (sections 4, 5, 7 and Batch 2). Service guide: [service-guide-plugin](../04-backend/service-guide-plugin.md).

## Context

Batch 2 turns the read-only catalog into something a user owns: an install per user and plugin, a per-tool consent, and (for API-key plugins) a secret. Each of those is a place where a small mistake becomes a security incident: an install id from another account, a credential echoed in a response or a log, an install cap that a parallel request slips under, a placeholder encryption key that nobody notices.

## Decision

- **An install is owner-scoped by construction.** Every query that takes an install id also takes the user id from the JWT (`where: { id, userId }`). Another user's id is indistinguishable from a missing one and answers `404 PLUGIN_INSTALL_NOT_FOUND`. The user id is never read from a body, query or path.
- **One install per user and plugin** (`unique(userId, pluginId)`), pinned to a version (`versionId`). Status is `ENABLED` or `DISABLED`; the state the user sees adds `UNAVAILABLE` when the plugin was switched off globally or is no longer published, without touching the stored status, so a re-enable by the admin restores what the user had.
- **The plan cap is enforced where the row is written.** `maxInstalledPlugins` comes from the entitlements payload (`null` unlimited and every ADMIN, `0` disabled, `allowPlugins` off is `403 PLUGIN_PLAN_DISABLED`). The count and the insert share one transaction behind a per-user advisory lock, so two parallel installs cannot both pass. Over the cap answers `403 PLUGIN_INSTALL_LIMIT` with `limit` and `current`. An unreadable cap or an auth-service outage fails closed with `503`.
- **Settings are validated against the manifest's `settingsSchema`**, with defaults filled in, unknown keys refused and the value never echoed in an error. The checker covers the subset the manifest schema already allows (types, enum, const, required, min/max, length, array limits) rather than pulling a general validator into the service.
- **Consent is a stored grant per tool.** READ tools need none (`400 PLUGIN_CONSENT_NOT_REQUIRED`). The level in the request must equal the tool's declared risk (`400 PLUGIN_CONSENT_LEVEL_MISMATCH`), so a client cannot record a WRITE grant against a DESTRUCTIVE tool. WRITE is remembered; DESTRUCTIVE is stored but the runtime (batch 3) still asks on every call, and any non-READ call after untrusted content asks regardless. Storing the grant records what the user chose; it is not the permission to skip the prompt.
- **Credentials are write-only.** `PUT /installs/:id/credential` seals the value with AES-256-GCM under `PLUGIN_ENCRYPTION_KEY`, with the additional authenticated data `userId:installId`, so a row copied to another user or install cannot be opened. The column holds `base64(nonce || tag || ciphertext)` and a `keyVersion` for rotation. No endpoint returns the ciphertext or the value; the install view carries only `hasCredential`, the kind and the update time. The repository never selects the ciphertext for reads. Request bodies named `value` or `credential` are redacted from request logs, validation errors never echo the value, and the service logs only the install id. The header that carries the key must be on the allow list (`Authorization`, `X-API-Key`, `Api-Key`, `X-*`), never `Host`, `Cookie`, `Proxy-*` or similar. There is no decrypt path yet: it arrives with the invoke path.
- **The key is checked at boot.** The AES-GCM helper moved from agent-service into `@claw/shared-utilities` (`encryptWithAad`, `decryptWithAad`, `isStrongAes256HexKey`) so it is not copied a third time. `AppConfig` refuses to start when `PLUGIN_ENCRYPTION_KEY` is missing, short, not hex, or all zeros, with a message that never contains the value. This closes the TODO recorded in ADR-171: a copied `.env.example` can no longer silently encrypt credentials with a known key. Rotation uses `keyVersion`; changing the key without re-sealing orphans stored credentials.
- **Admin controls are database state.** `PLUGINS_ADMIN` can switch a plugin off for everyone (`globallyEnabled`), feature it, and disable single tools of the current version (`disabledByAdmin`), and can edit the `PluginSetting` rows. Setting keys must be known and values are range-checked (booleans, whole numbers within a minimum and maximum); a bad key or value rejects the whole change. Every write is logged with the acting admin.
- **Account deletion removes everything.** The service consumes `user.deleted` like the Threads services ([ADR-160](adr-160-threads-account-deletion-propagation.md)) and deletes the user's credentials, consents, installs and invocation audit in one transaction, lowering each plugin's install count. It is idempotent, so a redelivered event finds nothing, and it logs the event id and counts, never the account id.
- **The invocation audit table exists, empty.** `plugin_invocations` ships in this batch so the shape is reviewed once; rows are written by the invoke path in batch 3.

## Consequences

- A leaked database dump contains only ciphertext bound to user and install, and a leak of `ENCRYPTION_KEY` does not open it.
- The install cap costs one advisory lock per install request; installs are rare, so the lock is not a hot path.
- The settings checker is intentionally small. A manifest that needs more of JSON Schema than the subset must extend the checker and the publish-time subset check together.
- Rotating `PLUGIN_ENCRYPTION_KEY` needs a re-seal job that reads with the old key and writes with the new one and bumps `keyVersion`. It is not built yet because nothing reads credentials yet.
- Events (`plugin.installed`, `plugin.uninstalled`) are not published in this batch; the audit-service consumer and the events arrive with the invoke path.
