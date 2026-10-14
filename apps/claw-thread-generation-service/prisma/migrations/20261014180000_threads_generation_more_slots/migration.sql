-- ADR-183. Additive and idempotent. A production service runs ONE replica (container_name is fixed),
-- so the per-replica concurrency is the whole service's concurrency; at 3 a burst of Threads sat
-- QUEUED for 15 to 40 minutes. Six jobs per replica and twelve slots (room for two replicas).
INSERT INTO "thread_generation_worker_slots" ("slot_id")
VALUES
  ('threads-worker-7'),
  ('threads-worker-8'),
  ('threads-worker-9'),
  ('threads-worker-10'),
  ('threads-worker-11'),
  ('threads-worker-12')
ON CONFLICT ("slot_id") DO NOTHING;
