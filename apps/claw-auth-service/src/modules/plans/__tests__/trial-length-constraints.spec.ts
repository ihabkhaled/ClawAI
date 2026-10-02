// ADR-140 production incident (2026-10-01): the plan table allowed any trial
// length, but plan_trial_redemptions still demanded exactly 30 days, so a 90-day
// Free plan made every signup and every admin Free assignment fail with HTTP 500.
// This reads the migration history and asserts that the CURRENT definition of
// every trial constraint (the last migration that sets it) fixes no day count.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', '..', 'prisma', 'migrations');
const TRIAL_CONSTRAINTS = ['plans_trial_duration_check', 'plan_trial_redemptions_duration_check'];

function lastDefinition(constraint: string): string {
  const folders = readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{14}_/u.test(name))
    .sort();
  let latest = '';
  for (const folder of folders) {
    const sql = readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');
    const statements = sql.split(';').filter((s) => s.includes(constraint) && /CHECK/iu.test(s));
    if (statements.length > 0) {
      latest = statements.at(-1) ?? latest;
    }
  }
  return latest;
}

describe('trial length is never hard-coded in the database', () => {
  it.each(TRIAL_CONSTRAINTS)('%s has a current CHECK definition', (constraint) => {
    expect(lastDefinition(constraint)).not.toBe('');
  });

  it.each(TRIAL_CONSTRAINTS)('%s does not pin a fixed number of days', (constraint) => {
    const definition = lastDefinition(constraint);
    expect(definition).not.toMatch(/INTERVAL\s+'\d+\s+days?'/iu);
    expect(definition).not.toMatch(/trial_duration_days"?\s*=\s*\d+/iu);
  });

  it('a redemption only has to end after it starts, so admins can extend it', () => {
    expect(lastDefinition('plan_trial_redemptions_duration_check')).toMatch(
      /"expires_at"\s*>\s*"started_at"/u,
    );
  });
});
