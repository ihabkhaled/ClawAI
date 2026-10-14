-- ADR-162 addendum: a Thread job the platform failed (no completed draft) closes as
-- PLATFORM_FAILED. The value is added in its own migration: Postgres cannot use a new enum
-- value inside the transaction that added it.
ALTER TYPE "ThreadJobBudgetState" ADD VALUE IF NOT EXISTS 'PLATFORM_FAILED';
