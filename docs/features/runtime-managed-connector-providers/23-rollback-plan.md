# Rollback plan

1. Disable the new Admin route and provider-definition API by rolling back
   connector-service and frontend code.
2. Roll back connector-service and routing-service images in lockstep; do not
   remove enum values, columns, tables, or used definitions.
3. Existing built-in connectors remain valid because the migration is additive
   and leaves old enum values/rows intact.
4. Keep newly created custom rows inactive for later investigation; never delete
   keys, connector credentials, models, routing history, or cost history as a
   rollback shortcut.
5. If a failed custom connector is discovered, deactivate it and preserve the
   provider definition for audit/history.
