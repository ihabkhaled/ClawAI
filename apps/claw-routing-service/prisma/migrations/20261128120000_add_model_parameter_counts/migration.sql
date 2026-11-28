-- ADR-234: the size of a model, shown beside its name in every picker.
-- Two nullable columns on the registry, in BILLIONS of parameters (so 0.5 is
-- 500M and 1000 is 1T). `parameter_count_billions` is the total; the active
-- column is the per-token share of a mixture-of-experts model. NULL means the
-- maker publishes no count (every closed model), never "unknown yet", and no
-- default is written: existing rows keep NULL until the runtime report, the
-- published-count seed or an admin fills them. Additive and reversible
-- (DROP COLUMN); nothing reads these columns before this migration runs.
ALTER TABLE "router_model_registry"
  ADD COLUMN IF NOT EXISTS "parameter_count_billions" DECIMAL(9, 3),
  ADD COLUMN IF NOT EXISTS "active_parameter_count_billions" DECIMAL(9, 3);
