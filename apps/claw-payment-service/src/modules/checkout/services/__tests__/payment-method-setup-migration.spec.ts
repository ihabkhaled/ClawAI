import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('payment-method setup migration', () => {
  it('enforces purpose-dependent fields in PostgreSQL', async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260727013000_add_payment_method_setup_sessions/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('checkout_sessions_purpose_fields_check');
    expect(migration).toMatch(/"purpose" = 'PAYMENT_METHOD_SETUP'[\s\S]*"plan_id" IS NULL/u);
    expect(migration).toMatch(
      /"purpose" IN \('NEW_SUBSCRIPTION', 'UPGRADE', 'RENEWAL'\)[\s\S]*"plan_id" IS NOT NULL/u,
    );
    expect(migration).toMatch(/"payment_method_consented_at" IS NOT NULL/u);
  });
});
