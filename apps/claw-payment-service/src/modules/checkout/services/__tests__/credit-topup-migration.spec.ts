import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MIGRATION_PATH = 'prisma/migrations/20260829120200_add_credit_topup_checkout/migration.sql';

// Comments are stripped so an assertion about the SQL cannot be satisfied — or
// broken — by prose that happens to quote the statement it is warning about.
const readMigration = async (): Promise<string> => {
  const raw = await readFile(resolve(process.cwd(), MIGRATION_PATH), 'utf8');
  return raw
    .split(/\r?\n/u)
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
};

/**
 * The CHECK constraint is the reason this migration exists.
 *
 * `CheckoutPurpose.CREDIT_TOPUP` shipped in shared-types before this branch
 * existed, and a top-up row satisfies NEITHER of the two original branches — so
 * every top-up insert would have failed at the database. These assertions are
 * the regression guard for that, and for the mirror failure: a subscription row
 * that quietly carries credit fields.
 */
describe('credit top-up checkout migration', () => {
  it('adds CREDIT_TOPUP to the purpose enum without an unsafe in-transaction ADD VALUE', async () => {
    const migration = await readMigration();

    // Rename-and-recreate, not `ALTER TYPE ... ADD VALUE`: PostgreSQL refuses to
    // USE a value added in the same transaction, and the new CHECK branch uses
    // it on its first line.
    expect(migration).not.toMatch(/ALTER TYPE[\s\S]*ADD VALUE/u);
    expect(migration).toContain('ALTER TYPE "CheckoutSessionPurpose" RENAME TO');
    expect(migration).toMatch(
      /CREATE TYPE "CheckoutSessionPurpose" AS ENUM \([\s\S]*'CREDIT_TOPUP'[\s\S]*\)/u,
    );
    expect(migration).toContain('DROP TYPE "CheckoutSessionPurpose_old"');
  });

  it('adds the three credit columns with BIGINT for micro-USD', async () => {
    const migration = await readMigration();

    expect(migration).toContain('ADD COLUMN "credit_package_id" TEXT');
    expect(migration).toContain('ADD COLUMN "credit_package_version_id" TEXT');
    // BIGINT, not INTEGER: a large package exceeds INTEGER in micro-USD.
    expect(migration).toContain('ADD COLUMN "credit_micro_usd" BIGINT');
  });

  it('drops and recreates the purpose CHECK rather than adding a second one', async () => {
    const migration = await readMigration();

    expect(migration).toContain(
      'DROP CONSTRAINT IF EXISTS "checkout_sessions_purpose_fields_check"',
    );
    expect(migration).toContain('ADD CONSTRAINT "checkout_sessions_purpose_fields_check"');
    expect(
      migration.match(/ADD CONSTRAINT "checkout_sessions_purpose_fields_check"/gu),
    ).toHaveLength(1);
  });

  it('rejects a CREDIT_TOPUP row missing any credit field', async () => {
    const migration = await readMigration();
    const branch = migration.slice(migration.indexOf(`"purpose" = 'CREDIT_TOPUP'`));

    expect(branch).toMatch(/"credit_package_id" IS NOT NULL/u);
    expect(branch).toMatch(/"credit_package_version_id" IS NOT NULL/u);
    expect(branch).toMatch(/"credit_micro_usd" IS NOT NULL/u);
    // Zero credit for real money is a mispriced row, not a purchase.
    expect(branch).toMatch(/"credit_micro_usd" > 0/u);
  });

  it('rejects a CREDIT_TOPUP row carrying plan fields', async () => {
    const migration = await readMigration();
    const branch = migration.slice(migration.indexOf(`"purpose" = 'CREDIT_TOPUP'`));

    expect(branch).toMatch(/"plan_id" IS NULL/u);
    expect(branch).toMatch(/"plan_slug" IS NULL/u);
    expect(branch).toMatch(/"plan_price_version_id" IS NULL/u);
    expect(branch).toMatch(/"billing_interval" IS NULL/u);
    expect(branch).toMatch(/"subscription_id" IS NULL/u);
    expect(branch).toMatch(/"proration_quote_id" IS NULL/u);
  });

  it('requires a positive amount on a CREDIT_TOPUP row', async () => {
    const migration = await readMigration();
    const branch = migration.slice(migration.indexOf(`"purpose" = 'CREDIT_TOPUP'`));

    expect(branch).toMatch(/"base_amount_minor" IS NOT NULL/u);
    expect(branch).toMatch(/"base_amount_minor" > 0/u);
    expect(branch).toMatch(/"charge_amount_minor" IS NOT NULL/u);
    expect(branch).toMatch(/"charge_amount_minor" > 0/u);
  });

  it('rejects a subscription row that carries credit fields', async () => {
    const migration = await readMigration();
    const start = migration.indexOf(`"purpose" IN ('NEW_SUBSCRIPTION', 'UPGRADE', 'RENEWAL')`);
    const branch = migration.slice(start, migration.indexOf(`"purpose" = 'CREDIT_TOPUP'`));

    expect(branch).toMatch(/"credit_package_id" IS NULL/u);
    expect(branch).toMatch(/"credit_package_version_id" IS NULL/u);
    expect(branch).toMatch(/"credit_micro_usd" IS NULL/u);
  });

  it('rejects a payment-method-setup row that carries credit fields', async () => {
    const migration = await readMigration();
    const start = migration.indexOf(`"purpose" = 'PAYMENT_METHOD_SETUP'`);
    const branch = migration.slice(
      start,
      migration.indexOf(`"purpose" IN ('NEW_SUBSCRIPTION', 'UPGRADE', 'RENEWAL')`),
    );

    expect(branch).toMatch(/"credit_package_id" IS NULL/u);
    expect(branch).toMatch(/"credit_package_version_id" IS NULL/u);
    expect(branch).toMatch(/"credit_micro_usd" IS NULL/u);
  });

  it('preserves the two original branches verbatim in their invariants', async () => {
    const migration = await readMigration();

    expect(migration).toMatch(/"payment_method_consented_at" IS NOT NULL/u);
    expect(migration).toMatch(
      /"purpose" IN \('NEW_SUBSCRIPTION', 'UPGRADE', 'RENEWAL'\)[\s\S]*"plan_id" IS NOT NULL/u,
    );
  });
});
