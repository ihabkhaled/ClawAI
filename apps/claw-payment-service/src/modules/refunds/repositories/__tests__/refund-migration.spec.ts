import { readFile } from 'node:fs/promises';

describe('refund migration', () => {
  it('enforces positive integer refunds and aggregate captured-balance safety in PostgreSQL', async () => {
    const migration = await readFile(
      'prisma/migrations/20260727040000_add_refunds/migration.sql',
      'utf8',
    );

    expect(migration).toContain('CREATE TABLE "refunds"');
    expect(migration).toContain('"refunds_amount_positive_check"');
    expect(migration).toContain('CREATE FUNCTION "enforce_refund_balance"');
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain("status IN ('PENDING', 'SUCCEEDED')");
    expect(migration).toContain('refund total exceeds captured transaction amount');
  });
});
