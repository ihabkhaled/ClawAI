import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('scheduled plan change reason migration', () => {
  it('adds a constrained reason that distinguishes retirement from user downgrade', async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        'prisma/migrations/20260801203000_add_scheduled_plan_change_reason/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('"scheduled_change_reason" TEXT');
    expect(migration).toContain("'USER_REQUESTED_DOWNGRADE'");
    expect(migration).toContain("'PLAN_RETIREMENT'");
  });
});
