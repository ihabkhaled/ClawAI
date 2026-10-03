# ADR-157: Runtime managed connector providers

**Status**: Accepted  
**Date**: 2026-10-03

## Context

ADR-117 made `CONNECTOR_PRESETS` the single source of truth for built-in
OpenAI-compatible providers. That registry and the generic adapter removed
copy-pasted provider implementations, but provider creation still requires an
enum value, a code change, and a deployment. An Admin CRUD table alone would be a
facade: connector-service, routing, and chat could not resolve a provider key that
was absent from their compiled registries.

ClawAI also distinguishes the provider definition from a connector instance. A
definition describes a trusted adapter family, endpoints, model discovery,
capabilities, links, and default billing classification. A connector instance
contains the operator's encrypted credentials and its health/model state.

## Decision

1. Keep all existing built-in provider identities and the ADR-117 registry.
2. Add a database-backed provider-definition catalog owned by connector-service.
   Runtime definitions initially accept only the existing OpenAI-compatible
   adapter family. Configuration is validated data. Admins cannot upload code,
   choose an unknown protocol, or add arbitrary request headers.
3. Store custom connector instances with one additive
   `CUSTOM_OPENAI_COMPATIBLE` connector enum value plus a foreign key to their
   definition. Existing connector rows, IDs, enum values, encrypted credentials,
   and models remain intact. The provider key is unique, normalized and immutable
   once used.
4. Carry the custom provider key as provider identity through connector model
   snapshots, routing's string-backed model registry, chat model selections, and
   connector config lookup. Routing and chat obtain the configuration through
   existing service boundaries; neither reads connector-service's database.
   Built-in contracts continue to use their current keys.
5. A custom OpenAI-compatible adapter receives its validated definition at
   runtime. Adapter code, protocol behavior, security checks, capability parsing,
   and model-kind rules remain in versioned code. A new executable protocol needs
   a code release.
6. `ADMIN_CONNECTORS_MANAGE` governs provider management. It already protects
   connector administration and is specifically the reuse default in the
   provider-management pack. Backend guards remain authoritative.
7. Seed built-in providers as protected definitions with their existing enum
   identity. Admins may change only active status; identity, adapter family,
   runtime settings, and physical rows are protected. Deactivation removes a
   provider from new connector creation, model catalogs/snapshots, health
   startup checks, PAYG policy and config lookup while retaining history.
   Existing presets still resolve through `CONNECTOR_PRESETS`; bespoke
   providers still resolve through their specialized adapters.
   Custom execution settings are locked while a connector references them.
8. A custom definition becomes permanently non-deletable once ever connected.
   Connector creation and its `everConnected` marker share one database
   transaction. This conservative tombstone protects downstream routing and cost
   history without crossing database boundaries. Never cascade-delete models,
   credentials or audit data.
9. Provider URLs require public HTTPS syntax and reject common private/local hosts,
   IPs and embedded credentials. Requests use the shared host guard, timeout and
   redirect rejection. DNS resolution is not pinned; deployments with untrusted
   administrators still need outbound network controls.
10. Provider mutations publish existing audit-service events with actor, action,
    definition ID/key and changed field names. Secrets and encrypted config are
    excluded.
11. Custom provider default PAYG is false. An administrator can explicitly mark
    a configured connector as credit-metered using the current connector flow.
    Unknown model rates remain unknown; this feature does not invent prices or
    describe free-tier metadata as unlimited inference.
12. There is no definition cache; runtime lookups read the database. Endpoint
    edits are refused while connectors are linked, and admins re-sync after safe
    edits. Status changes propagate through snapshots and config lookup without
    deleting model history.

## Migration and rollout

The connector-service migrations add the provider-definition table and nullable
connector reference, then add the code-managed adapter family, seed all built-in
definitions, and link existing connectors by enum identity. That link backfill
does not change credentials, models, exposure, health, cost policy, or routing
records. The routing migration adds its generic enum value and runtime provider
key. A clean install and upgrade are required. Deploy before code that requires
the new fields; rollback disables the new endpoints and leaves additive
rows/columns intact. No service queries another service's database.

## Relationship to ADR-117

ADR-117 remains authoritative for built-in compatible providers and its
single-source-of-truth and generic-adapter principles. The database catalog
provides managed status and a view over those providers; runtime preset data
continues to come from the shared registry. Specialized providers use protected
`CODE_MANAGED` definitions and are not converted to generic compatibility.

## Pack 2 boundary

NVIDIA NIM uses the OpenAI-compatible path documented by the official
[NIM LLM API reference](https://docs.api.nvidia.com/nim/reference/llm-apis), with
hosted base URL `https://integrate.api.nvidia.com`. Hugging Face non-chat tasks,
Pollinations media, and AI Horde's asynchronous REST protocol require specialized execution paths and
are not implemented by this ADR. They remain a separate provider integration
delivery.

## Consequences

- Compatible providers can be registered and configured at runtime without an
  enum addition or provider-specific deployment.
- Provider definitions and connector credentials have separate ownership and
  lifecycles.
- Model identity and cost policy must preserve the runtime provider key across
  service boundaries.
- Admin-provided endpoint data is a security-sensitive outbound request surface.
- Provider deactivation is reversible; deletion is dependency-guarded.

## Verification criteria

Create a provider definition, configure a connector, sync and expose a model,
resolve it in routing, and execute a chat request. Deactivation must prevent new
connections and inference while preserving all stored data; reactivation restores
eligibility after ordinary health/exposure checks. Existing built-in connector
behavior and identity must not change.
