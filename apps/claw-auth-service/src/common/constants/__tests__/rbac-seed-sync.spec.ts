import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Permission } from '@claw/shared-types';

import { ALL_PERMISSIONS, USER_DEFAULT_PERMISSIONS } from '../rbac.constants';

// The seeders are plain .cjs, because the prod image ships no src/ tree and may
// have no ts-node. That buys deployability at the cost of a duplicated list,
// and a duplicated list drifts — a permission added to the enum but not to the
// seeder simply never reaches the catalog, so the role matrix cannot grant it
// and nobody finds out until someone asks why a checkbox is missing.
//
// This is the check that makes the duplication safe.
function readSeedArray(file: string, name: string): string[] {
  const source = readFileSync(join(__dirname, '..', '..', '..', '..', 'prisma', file), 'utf8');
  const start = source.indexOf(`const ${name} = [`);
  if (start === -1) {
    throw new Error(`${name} not found in ${file}`);
  }
  const end = source.indexOf('];', start);
  return [...source.slice(start, end).matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1] ?? '');
}

describe('permission seeders stay in sync with the enum', () => {
  it.each(['seed.cjs', 'seed-permissions.cjs'])(
    '%s grants ADMIN exactly the permissions the enum defines',
    (file) => {
      expect(readSeedArray(file, 'ALL_PERMISSIONS').sort()).toEqual(
        Object.values(Permission).sort(),
      );
    },
  );

  it.each(['seed.cjs', 'seed-permissions.cjs'])(
    '%s gives the USER role exactly the typed default set',
    (file) => {
      expect(readSeedArray(file, 'USER_DEFAULT_PERMISSIONS').sort()).toEqual(
        [...USER_DEFAULT_PERMISSIONS].sort(),
      );
    },
  );

  it('gives ADMIN every permission', () => {
    expect([...ALL_PERMISSIONS].sort()).toEqual(Object.values(Permission).sort());
  });

  it('withholds every agent surface from the USER role by default', () => {
    // The product decision: a normal user gets the agent itself, and none of
    // its individual surfaces, until an admin grants them in the role matrix.
    const agentSurfaces = Object.values(Permission).filter(
      (permission) => permission.startsWith('AGENT_') && permission !== Permission.AGENT_USE,
    );
    expect(agentSurfaces).toHaveLength(7);
    for (const permission of agentSurfaces) {
      expect(USER_DEFAULT_PERMISSIONS).not.toContain(permission);
      expect(ALL_PERMISSIONS).toContain(permission);
    }
  });
});
