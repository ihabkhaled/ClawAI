# Data and migration plan

Connector migration `20261003120000_runtime_managed_connector_providers` adds the
generic enum value, definition table, `ever_connected`, nullable connector FK,
indexes, and RESTRICT FK. It does not rewrite existing connector/model rows.
Routing migration `20261003130000_runtime_provider_identity` adds the generic
router enum value and nullable `runtime_provider_key`.

Connector migrations `20261003140000_provider_adapter_code_managed` and
`20261003150000_seed_builtin_provider_definitions` add the protected code-managed
family, nullable preset fields for bespoke adapters, seed all built-in provider
definitions, and link existing connectors by enum identity. The backfill only
sets `provider_definition_id`; connector credentials, models, exposure, health,
PAYG policy, and routing records are not rewritten.

New connector creation and `ever_connected=true` are written in one connector DB
transaction. This guards against orphaned routing or cost records without
cross-service database queries. Built-in identity stays in the existing enum,
and its adapter remains the existing code path.

Roll forward with `prisma migrate deploy` before new service code. Rollback is
code rollback only; additive tables/columns/enum values are retained. Validate a
clean install and an upgrade before release; live DB migration evidence is open.
