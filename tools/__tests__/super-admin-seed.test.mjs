import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const require = createRequire(import.meta.url);
const {
  reconcileExistingSuperAdmin,
} = require('../../apps/claw-auth-service/prisma/seed-super-admin.js');

test('production seed promotes the configured existing administrator', async () => {
  const updates = [];
  const prisma = {
    user: {
      findUnique: async () => ({ id: 'configured-admin', emailVerifiedAt: null }),
      findFirst: async () => null,
      update: async (input) => updates.push(input),
    },
  };

  const handled = await reconcileExistingSuperAdmin({
    prisma,
    adminEmail: 'owner@example.com',
    adminRoleId: 'admin-role',
    verifiedAt: new Date('2026-08-13T00:00:00.000Z'),
  });

  assert.equal(handled, true);
  assert.deepEqual(updates, [
    {
      where: { id: 'configured-admin' },
      data: {
        role: 'ADMIN',
        roleId: 'admin-role',
        status: 'ACTIVE',
        isSuperAdmin: true,
        firstName: 'Claw',
        lastName: 'Administrator',
        emailVerifiedAt: new Date('2026-08-13T00:00:00.000Z'),
      },
    },
  ]);
});

test('production seed preserves an existing immutable super administrator', async () => {
  let updateCalled = false;
  const prisma = {
    user: {
      findUnique: async () => null,
      findFirst: async () => ({ id: 'existing-super-admin' }),
      update: async () => {
        updateCalled = true;
      },
    },
  };

  const handled = await reconcileExistingSuperAdmin({
    prisma,
    adminEmail: 'replacement@example.com',
    adminRoleId: 'admin-role',
    verifiedAt: new Date('2026-08-13T00:00:00.000Z'),
  });

  assert.equal(handled, true);
  assert.equal(updateCalled, false);
});

test('production seed reports that a new administrator must be created', async () => {
  const prisma = {
    user: {
      findUnique: async () => null,
      findFirst: async () => null,
      update: async () => undefined,
    },
  };

  const handled = await reconcileExistingSuperAdmin({
    prisma,
    adminEmail: 'first-admin@example.com',
    adminRoleId: 'admin-role',
    verifiedAt: new Date('2026-08-13T00:00:00.000Z'),
  });

  assert.equal(handled, false);
});

test('corrective migration safely promotes the sole administrator', async () => {
  const migration = await readFile(
    path.join(
      repositoryRoot,
      'apps',
      'claw-auth-service',
      'prisma',
      'migrations',
      '20260813181000_reconcile_existing_super_admin',
      'migration.sql',
    ),
    'utf8',
  );

  assert.match(migration, /HAVING COUNT\(\*\) = 1/);
  assert.match(migration, /NOT EXISTS[\s\S]+is_super_admin = true/);
  assert.match(migration, /email_verified_at = COALESCE/);
});
