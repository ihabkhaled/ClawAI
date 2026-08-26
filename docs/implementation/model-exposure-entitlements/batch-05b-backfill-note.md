# Batch 05b — Backfill Note

The backfill migration `20260823093000_backfill_existing_model_exposure` marks
every `connector_models` row EXPOSED where `lifecycle = 'ACTIVE'` on an enabled
connector (`connectors.is_enabled = true`) and the row is currently UNEXPOSED.

Grandfathering was chosen over leaving everything unexposed because an upgrade
must not silently remove every model from every user's picker; the exposure
model controls what is offered going forward, not what already worked.

The statement is idempotent (it only touches rows still at UNEXPOSED) and is a
no-op on a fresh database, which has no rows to update.

Models discovered after this migration still arrive UNEXPOSED, so the
fail-closed default survives for everything new.

An administrator can still unexpose any grandfathered model, and the backfill
will not undo that because of the `exposure = 'UNEXPOSED'` predicate.
