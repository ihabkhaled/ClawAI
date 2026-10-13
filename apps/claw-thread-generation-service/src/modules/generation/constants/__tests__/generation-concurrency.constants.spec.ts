import concurrencyMigration from '../../../../../prisma/migrations/20261014120000_threads_generation_concurrency/migration.sql?raw';
import recoveryMigration from '../../../../../prisma/migrations/20261005120000_threads_generation_recovery/migration.sql?raw';
import prismaSchema from '../../../../../prisma/schema.prisma?raw';
import {
  BUDGET_CLOSE_BASE_DELAY_MS,
  BUDGET_CLOSE_MAX_ATTEMPTS,
  BUDGET_CLOSE_MAX_DELAY_MS,
  budgetCloseDelayMs,
  GENERATION_LEASE_MS,
  GENERATION_OWNER_MAX_RUNNING,
  GENERATION_QUEUE_MAX_AGE_MS,
  GENERATION_REPLICA_CONCURRENCY,
  GENERATION_STALE_GRACE_MS,
  GENERATION_WORKER_SLOT_COUNT,
  GENERATION_WORKER_SLOT_IDS,
} from '../generation.constants';

describe('generation concurrency numbers', () => {
  it('keeps per-replica concurrency in the 2 to 4 range and the owner cap below the slots', () => {
    expect(GENERATION_REPLICA_CONCURRENCY).toBeGreaterThanOrEqual(2);
    expect(GENERATION_REPLICA_CONCURRENCY).toBeLessThanOrEqual(4);
    expect(GENERATION_OWNER_MAX_RUNNING).toBeGreaterThanOrEqual(1);
    expect(GENERATION_OWNER_MAX_RUNNING).toBeLessThan(GENERATION_WORKER_SLOT_COUNT);
  });

  it('has a distinct worker slot for every job that may run, at least two replicas wide', () => {
    expect(new Set(GENERATION_WORKER_SLOT_IDS).size).toBe(GENERATION_WORKER_SLOT_COUNT);
    expect(GENERATION_WORKER_SLOT_COUNT).toBeGreaterThanOrEqual(GENERATION_REPLICA_CONCURRENCY * 2);
  });

  it('seeds every slot id in a migration, idempotently', () => {
    const migrations = [recoveryMigration, concurrencyMigration].join('\n');

    for (const slotId of GENERATION_WORKER_SLOT_IDS) {
      expect(migrations).toContain(`'${slotId}'`);
    }
    expect(migrations).toContain('ON CONFLICT ("slot_id") DO NOTHING');
  });

  it('adds the retry bookkeeping columns additively and idempotently', () => {
    const sql = concurrencyMigration;

    expect(sql).toContain(
      'ADD COLUMN IF NOT EXISTS "budget_close_attempts" INTEGER NOT NULL DEFAULT 0',
    );
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "budget_close_next_at" TIMESTAMP(3)');
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS/u);
    expect(sql).not.toMatch(/DROP |ALTER COLUMN|DELETE FROM|UPDATE /u);
    expect(prismaSchema).toContain('@map("budget_close_attempts")');
    expect(prismaSchema).toContain('@map("budget_close_next_at")');
  });

  it('bounds the budget close retries to about half an hour of back-off', () => {
    let total = 0;
    for (let failure = 1; failure < BUDGET_CLOSE_MAX_ATTEMPTS; failure += 1) {
      total += budgetCloseDelayMs(failure);
    }
    expect(budgetCloseDelayMs(1)).toBe(BUDGET_CLOSE_BASE_DELAY_MS);
    expect(budgetCloseDelayMs(1_000)).toBe(BUDGET_CLOSE_MAX_DELAY_MS);
    expect(total).toBeLessThanOrEqual(35 * 60_000);
  });

  it('waits longer than a lease before treating a job as abandoned or expired', () => {
    expect(GENERATION_STALE_GRACE_MS).toBeGreaterThan(GENERATION_LEASE_MS);
    expect(GENERATION_QUEUE_MAX_AGE_MS).toBeGreaterThan(60 * 60_000);
  });
});
