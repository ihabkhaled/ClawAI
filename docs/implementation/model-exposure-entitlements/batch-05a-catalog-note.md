# Batch 05a - Exposure now gates the user catalog

`getAvailableModels` now calls the new `findExposedForCatalog`, which requires the connector to be enabled, its lifecycle to be `ACTIVE`, the exposure to be `EXPOSED`, and the kind to be `CHAT`. Anything not meeting all four conditions is excluded from the user-facing catalog.

`findAllForSnapshot` is deliberately left unfiltered. The routing-service snapshot depends on router-infrastructure models that are never user-executable, so filtering it by exposure would have starved the router of entries it needs.

`GET /connectors/:id/models` now requires `ADMIN_CONNECTORS_MANAGE`. It was the only route on that controller without a permission decorator, and it lists the full unexposed inventory, so it must be administrator-only like its siblings.

Every existing row defaulted to `UNEXPOSED` in the Batch 3 migration, so the user-facing catalog is empty until an administrator exposes models. This is intended fail-closed behaviour; the admin exposure API in the next batch is what fills the catalog.
